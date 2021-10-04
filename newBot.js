// ==UserScript==
// @name         kamiloBot
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  testowanie
// @author       viker
// @match        https://*.margonem.pl/
// @exclude      https://www.margonem.pl/
// @icon         https://www.google.com/s2/favicons?domain=margonem.pl
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// ==/UserScript==

if (typeof unsafeWindow !== "undefined") {
  //Nadpisywanie window w przypadku korzystania z unsafeWindow od GM.
  window = unsafeWindow;
}

(() => {
  "use strict";
  class AStar {
    constructor(
      collisionsString,
      width,
      height,
      start,
      end,
      additionalCollisions
    ) {
      this.width = width;
      this.height = height;
      this.collisions = this.parseCollisions(collisionsString, width, height);
      this.additionalCollisions = additionalCollisions || {};
      this.start = this.collisions[start.x][start.y];
      this.end = this.collisions[end.x][end.y];
      this.start.beginning = true;
      this.start.g = 0;
      this.start.f = heuristic(this.start, this.end);
      this.end.target = true;
      this.end.g = 0;
      //if(this.start.collision) throw new Error('Start point cannot be a collision!');
      //if(this.end.collision) throw new Error('End point cannot be a collision!');
      this.addNeighbours();
      this.openSet = [];
      this.closedSet = [];
      this.openSet.push(this.start);
    }

    parseCollisions(collisionsString, width, height) {
      const collisions = new Array(width);
      for (let w = 0; w < width; w++) {
        collisions[w] = new Array(height);
        for (let h = 0; h < height; h++) {
          collisions[w][h] = new Point(
            w,
            h,
            collisionsString.charAt(w + h * width) === "1"
          );
        }
      }
      return collisions;
    }

    addNeighbours() {
      for (let i = 0; i < this.width; i++) {
        for (let j = 0; j < this.height; j++) {
          this.addPointNeighbours(this.collisions[i][j]);
        }
      }
    }

    addPointNeighbours(point) {
      const x = point.x,
        y = point.y;
      const neighbours = [];
      if (x > 0) neighbours.push(this.collisions[x - 1][y]);
      if (y > 0) neighbours.push(this.collisions[x][y - 1]);
      if (x < this.width - 1) neighbours.push(this.collisions[x + 1][y]);
      if (y < this.height - 1) neighbours.push(this.collisions[x][y + 1]);
      point.neighbours = neighbours;
    }

    anotherFindPath() {
      while (this.openSet.length > 0) {
        let currentIndex = this.getLowestF();
        let current = this.openSet[currentIndex];
        if (current === this.end) return this.reconstructPath();
        else {
          this.openSet.splice(currentIndex, 1);
          this.closedSet.push(current);
          for (const neighbour of current.neighbours) {
            if (this.closedSet.includes(neighbour)) continue;
            else {
              const tentative_score = current.g + 1;
              let isBetter = false;
              if (
                this.end == this.collisions[neighbour.x][neighbour.y] ||
                (!this.openSet.includes(neighbour) &&
                  !neighbour.collision &&
                  !this.additionalCollisions[neighbour.x + 256 * neighbour.y])
              ) {
                this.openSet.push(neighbour);
                neighbour.h = heuristic(neighbour, this.end);
                isBetter = true;
              } else if (
                tentative_score < neighbour.g &&
                !neighbour.collision
              ) {
                isBetter = true;
              }
              if (isBetter) {
                neighbour.previous = current;
                neighbour.g = tentative_score;
                neighbour.f = neighbour.g + neighbour.h;
              }
            }
          }
        }
      }
    }

    getLowestF() {
      let lowestFIndex = 0;
      for (let i = 0; i < this.openSet.length; i++) {
        if (this.openSet[i].f < this.openSet[lowestFIndex].f) lowestFIndex = i;
      }
      return lowestFIndex;
    }

    reconstructPath() {
      const path = [];
      let currentNode = this.end;
      while (currentNode !== this.start) {
        path.push(currentNode);
        currentNode = currentNode.previous;
      }
      return path;
    }
  }

  class Point {
    constructor(x, y, collision) {
      this.x = x;
      this.y = y;
      this.collision = collision;
      this.g = 10000000;
      this.f = 10000000;
      this.neighbours = [];
      this.beginning = false;
      this.target = false;
      this.previous = undefined;
    }
  }
  const heuristic = (p1, p2) => {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  };

  const getWay = (x, y) => {
    return new AStar(
      map.col,
      map.x,
      map.y,
      { x: hero.x, y: hero.y },
      { x: x, y: y },
      g.npccol
    ).anotherFindPath();
  };

  const storage = new (class {
    constructor() {
      this.hasGMPermissions =
        typeof GM_getValue !== "undefined" &&
        typeof GM_setValue !== "undefined"; //Czy w GM zostały nadane uprawnienia GM_setValue oraz GM_getValue
      this.getVal = !this.hasGMPermissions
        ? window["localStorage"].getItem.bind(window.localStorage)
        : GM_getValue;
      this.setVal = !this
        .hasGMPermissions /* Wybranie sposobu zapisywania informacji, prioryter - GM_Storage */
        ? window["localStorage"].setItem.bind(window.localStorage)
        : GM_setValue;
      this.prefix = `${window.getCookie("user_id")}|${window.getCookie(
        "mchar_id"
      )}`; //Prefix umożliwiający osobne trasy na różnych postaciach.
    }
    get(name, def) {
      // Pobieranie wartości z storage w przypadku jej nie istnienia zwraca argument def, próbuje ją parsować.
      let val = this.getVal(`${this.prefix}|${name}`, def);
      try {
        return val !== null ? JSON.parse(val) : def;
      } catch (e) {
        return val !== null ? val : def;
      }
    }
    set(name, val) {
      //Zapisywanie do storage.
      this.setVal(`${this.prefix}|${name}`, val);
      return val; // Zwraza zapisaną wartość.
    }
  })();
  const isSi = window.getCookie("interface") === "si"; //Czy silnik jest SI. true/false

  const getCordsOfNextGw = (maps) => {
    const map = isSi ? window.map : window.Engine.map?.d; //Zmienna z mapą w zależności od silnika.
    //Przeniesione do środka z powodu późnej inicjacji mapy na NI

    //Argument to tablica z id map.
    if (!maps.includes(map.id)) {
      return false;
    } // Jeżeli nie znajdujemy się na trasie zwraca false
    let increament = storage.get("currIndex", 0);
    // Pobranie indexu z storage def = 0
    while (maps[increament] !== map.id) {
      //Dopóki index nie odpowiada indexowi aktualnej mapy inkrementujemy go.
      increament++;
      if (increament >= maps.length) {
        // W przypadku przekorczenia długości tablicy map zerujemy index, zeruje również jeżeli poprzednia tablica była dłuższa od obecnej i index przekroczył length.
        increament = 0;
      }
    }
    storage.set("currIndex", increament);
    //Zapisujemy znaleziony index.
    //Zapisywnaie przydatne przy trasach z powtarzającymi się tymi samymi mapami np. kanion.
    const desiredMap =
      increament === maps.length - 1
        ? maps[maps.length - 1] === maps[0]
          ? maps[1]
          : maps[0]
        : maps[++increament];
    //Jeżeli index jest równy długości tablicy, jeżeli wartość 0 indexu jest taka sama co ostatniego wybieramy wartość indexu 1 wpp wybieramy następną mapę w tablicy.
    if (!desiredMap) {
      return false;
    }
    //Jeżeli wystąpił błąd przy wyborze następnej mapy w celu uniknięcia kolejnych błędów zwracamy false.
    const desiredGw = isSi
      ? window.g.gwIds[desiredMap]?.split(".").map((val) => parseInt(val))
      : Engine.map.gateways.getList().find((gw) => gw.d.id === desiredMap).d;

    //Szukamy przejścia o odpowiednim id pasującym do wcześniej wybranej mapy z tablicy, pobierając je z zmiennych odpowiednich dla używanego silnika gry.
    if (!desiredGw) {
      return false;
    }
    //Jeżeli nie znaleziono przejścia zwracamy false.
    return isSi
      ? { x: desiredGw[0], y: desiredGw[1] } //si
      : { x: desiredGw.x, y: desiredGw.y }; //ni
  }; //Zwracamy obiekt z `x` oraz `y` znalezionego przejścia
  window.getCordsOfNextGw = getCordsOfNextGw;

  window.kamiloBot = new (class {
    constructor() {
      this.id = window.getCookie("user_id");
      this.e2Mob;
      this.bestMob;
      this.itemArr = [];
      this.settings = storage.get(`settingsBot`)
        ? storage.get(`settingsBot`)
        : {
            buttonE2: "Włącz!",
            selectE2: "default",
            setupy: "default",
            expMaps: ["Mapy do expienia"],
            expBack: ["Mapy dojściowe"],
            backE2Maps: [],
            buttonExp: "Włącz!",
            buttonBack: "Włącz!",
            buttonHeros: "Włącz!",
            buttonSell: "Włącz!",
            selectHeros: "default",
            delay: 500,
            toSellArr: "Wpisz co sellać rozdzielone `,`",
            display: "block",
            amountMix: 10,
          };
    }
    createDiv() {
      const mainMenu = document.createElement("div"),
        botPosition = storage.get("botPos")
          ? storage.get("botPos")
          : ["0px", "0px"];
      mainMenu.id = "mainMenu";
      mainMenu.innerHTML += `
      <div class="container">
        <div class="title"><span id="labelInfo">KamiloBot</span></div>
        <div class="sth1"></div>
        <div class="button1">
        <span>Elity II</span>
        <select id="selectE2">
          <option value="default" disabled>Wybierz E2</option>
          <option value="Goplana">Goplana 75lvl</option>
          <option value="Foverk Turrim">Foverk Turrim 57lvl</option>
        </select>
        <button id="buttonE2"></button>
        </div>

        <div class="button2">
        <span>Mapy dojściowe: </span> <input type="text" id="expBack">
        <span>Mapy:</span>
        <input type="text" id="expMaps">
        <span>Setupy: </span>
        <select id="setupy">
          <option value="default" disabled>Wybierz Setup</option>
          <option value="testowy">Testowy setup</option>
          <option value="testowy2">Testowy setup2</option>
        </select>
        <button id="buttonExp"></button>
        </div>

        <div class="areaButton1">
        <span>Herosi: </span>
        <select id="heros">
          <option value="default" disabled>Wybierz herosa</option>
          <option value="przewo">Zły przewodnik 63lvl</option>
          <option value="kostek">Piekielny kościej 74lvl</option>
        </select>
        <button id="buttonHeros"></button>
        </div>

        <div class="areaButton2">
          Wracanie: <button id="back"></button><br>
          Sellanie Tunia: <button id="sell"></button><br>
          Co sellać: <textarea id="sellFilter" rows="5" cols="33"></textarea><br>
          Ile mixów: <input type="number" id="amountMix">
        </div>

        <div class="sth2">
        </div>
    </div>`;
      document.body.appendChild(mainMenu);
      amountMix.value = this.settings.amountMix;
      amountMix.addEventListener("input", () => {
        this.settings.amountMix = amountMix.value;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      buttonE2.textContent = this.settings.buttonE2;
      if (this.settings.buttonE2 === "Włącz!") {
        this.settings.buttonE2 = "Włącz!";
        buttonE2.style.color = "red";
      } else {
        this.settings.buttonE2 = "Wyłącz!";
        buttonE2.style.color = "lime";
      }
      buttonE2.addEventListener("click", () => {
        if (this.settings.buttonE2 === "Włącz!") {
          this.settings.buttonE2 = "Wyłącz!";
          buttonE2.style.color = "lime";
        } else {
          this.settings.buttonE2 = "Włącz!";
          buttonE2.style.color = "red";
        }
        buttonE2.textContent = this.settings.buttonE2;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      selectE2.value = this.settings.selectE2;
      selectE2.addEventListener("change", () => {
        this.settings.selectE2 = selectE2.value;
        storage.set("settingsBot", JSON.stringify(this.settings));
        switch (selectE2.value) {
          case "Goplana":
            this.settings.backE2Maps = [
              257, 246, 229, 500, 701, 1137, 1141, 1145, 1146, 1147, 1149, 1150,
              1151,
            ];
            break;
        }
      });
      expMaps.value = this.settings.expMaps;
      expMaps.addEventListener("input", () => {
        this.settings.expMaps = expMaps.value
          .split(",")
          .map((el) => parseInt(el));
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      buttonExp.textContent = this.settings.buttonExp;
      if (this.settings.buttonExp === "Włącz!") {
        this.settings.buttonExp = "Włącz!";
        buttonExp.style.color = "red";
      } else {
        this.settings.buttonExp = "Wyłącz!";
        buttonExp.style.color = "lime";
      }
      buttonExp.addEventListener("click", () => {
        if (this.settings.buttonExp === "Włącz!") {
          this.settings.buttonExp = "Wyłącz!";
          buttonExp.style.color = "lime";
        } else {
          this.settings.buttonExp = "Włącz!";
          buttonExp.style.color = "red";
        }
        buttonExp.textContent = this.settings.buttonExp;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      switch (setupy.value) {
        case "testowy":
          this.settings.expMaps = [
            2731, 2732, 2733, 2730, 2733, 2732, 2731, 2730,
          ];
          expMaps.value = this.settings.expMaps;
          break;
      }
      sell.textContent = this.settings.buttonSell;
      if (this.settings.buttonSell === "Włącz!") {
        this.settings.buttonSell = "Włącz!";
        sell.style.color = "red";
      } else {
        this.settings.buttonSell = "Wyłącz!";
        sell.style.color = "lime";
      }
      sell.addEventListener("click", () => {
        if (this.settings.buttonSell === "Włącz!") {
          this.settings.buttonSell = "Wyłącz!";
          sell.style.color = "lime";
        } else {
          this.settings.buttonSell = "Włącz!";
          sell.style.color = "red";
        }
        sell.textContent = this.settings.buttonSell;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      sellFilter.value = this.settings.toSellArr;
      sellFilter.addEventListener("input", () => {
        this.settings.toSellArr = sellFilter.value.split(",");
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      back.textContent = this.settings.buttonBack;
      if (this.settings.buttonBack === "Włącz!") {
        this.settings.buttonBack = "Włącz!";
        back.style.color = "red";
      } else {
        this.settings.buttonBack = "Wyłącz!";
        back.style.color = "lime";
      }
      back.addEventListener("click", () => {
        if (this.settings.buttonBack === "Włącz!") {
          this.settings.buttonBack = "Wyłącz!";
          back.style.color = "lime";
        } else {
          this.settings.buttonBack = "Włącz!";
          back.style.color = "red";
        }
        back.textContent = this.settings.buttonBack;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      buttonHeros.textContent = this.settings.buttonHeros;
      if (this.settings.buttonHeros === "Włącz!") {
        this.settings.buttonHeros = "Włącz!";
        buttonHeros.style.color = "red";
      } else {
        this.settings.buttonHeros = "Wyłącz!";
        buttonHeros.style.color = "lime";
      }
      buttonHeros.addEventListener("click", () => {
        if (this.settings.buttonHeros === "Włącz!") {
          this.settings.buttonHeros = "Wyłącz!";
          buttonHeros.style.color = "lime";
        } else {
          this.settings.buttonHeros = "Włącz!";
          buttonHeros.style.color = "red";
        }
        buttonHeros.textContent = this.settings.buttonHeros;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      heros.value = this.settings.selectHeros;
      heros.addEventListener("input", () => {
        this.settings.selectHeros = heros.value;
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      expBack.value = this.settings.expBack;
      expBack.addEventListener("input", () => {
        this.settings.expBack = expBack.value
          .split(",")
          .map((el) => parseInt(el));
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      mainMenu.style.display = this.settings.display;
      labelInfo.addEventListener("click", () => {
        if (
          this.settings.display === "none" &&
          mainMenu.style.display === "none"
        ) {
          this.settings.display = "block";
          mainMenu.style.display = "block";
        } else {
          this.settings.display = "none";
          mainMenu.style.display = "none";
        }
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      document.querySelector("#lagmeter").addEventListener("click", () => {
        if (
          this.settings.display === "none" &&
          mainMenu.style.display === "none"
        ) {
          this.settings.display = "block";
          mainMenu.style.display = "block";
        } else {
          this.settings.display = "none";
          mainMenu.style.display = "none";
        }
        storage.set("settingsBot", JSON.stringify(this.settings));
      });
      this.css();
      mainMenu.style.left = botPosition[0];
      mainMenu.style.top = botPosition[1];
      this.draggable(mainMenu, "botPos");
    }
    css() {
      const css = document.createElement("style");
      css.innerHTML = `
          #mainMenu {
          position: absolute;
          width: 500px;
          height: 400px;
          background-color: grey;
          border-radius: 10px;
          z-index: 9999;
        }

        #mainMenu button {
          font-weight: bold;
          border-radius: 15px;
        }

        #mainMenu select {
          font-weight: bold;
          border-radius: 15px;
        }

        #expMaps {
          width: 150px;
          height: 50px;
        }

        #sellFilter {
          width: 180px;
          height: 30px;
          resize: none;
        }

        #amountMix {
          width: 30px;
        }

        .container {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          grid-template-rows: 1fr 1.6fr 0.4fr 1fr 1fr;
          gap: 0px 0px;
          grid-auto-flow: row;
          grid-template-areas:
            ". title title ."
            "button1 button1 button2 button2"
            "areaButton1 areaButton1 areaButton2 areaButton2"
            "areaButton1 areaButton1 areaButton2 areaButton2"
            "sth1 sth1 sth2 sth2";
        }
        
        .title { 
          grid-area: title;
          font-size: 30px;
          align-items: center;
          justify-content: center;
        }
        
        .sth1 { grid-area: sth1; }
        
        .button1 { 
          grid-area: button1;
          justify-content: center;
        }
        
        .button2 { grid-area: button2; }
        
        .areaButton1 { 
          grid-area: areaButton1;
          align-items: center;
          justify-content: center;
        }
        
        .areaButton2 { 
          grid-area: areaButton2;
          align-items: center;
          justify-content: center;
        }
        
        .sth2 { grid-area: sth2; } 
        `;
      document.head.appendChild(css);
    }
    getWay(x, y) {
      return new AStar(
        map.col,
        map.x,
        map.y,
        { x: hero.x, y: hero.y },
        { x: x, y: y },
        g.npccol
      ).anotherFindPath();
    }
    searchPath(x, y) {
      let _road_ = this.getWay(x, y);
      if (!Array.isArray(_road_)) return;
      window.road = _road_;
    }
    tpMap(mapId) {
      const idMap = Object.keys(g.item).find(
        (x) =>
          g.item[x].stat.includes("teleport=" + mapId + ",") &&
          !g.item[x].tip.includes("Gotowy do użycia za")
      );
      if (!idMap) {
        return message(`Nie znaleziono w torbie tp na mape ${mapId}`);
      } else if (window.map.id === mapId) {
        return message(`Znajdujesz sie juz na mapie ${map.name}`);
      }
      _g(`moveitem&id=${699694993}&st=1`);
      return _g(`moveitem&st=1&id=${idMap}`);
    }
    selling() {
      (async () => {
        while (true) {
          if (this.settings.buttonSell === "Wyłącz!") {
            switch (storage.get("sellProcess")) {
              case 1:
                if (window.map.id !== 344) {
                  this.tpMap(344);
                } else {
                  storage.set("sellProcess", 2);
                }
                break;
              case 2:
                if (window.map.id === 344) {
                  this.goToDoor(353);
                } else {
                  if (!g.lock.list[0]) {
                    this.talkToNpc(16366);
                  } else if (g.lock.list[0] === "npcdialog") {
                    this.clickText("Pokaż mi, ");
                  } else if (g.lock.list[0] === "shop") {
                    this.shopTransaction(
                      "Pomarańczowa mikstura",
                      this.settings.amountMix
                    );
                  }
                }
                break;
              case 3:
                //wracanie
                if (
                  g.lock.list[0] !== "npcdialog" ||
                  g.lock.list[0] !== "shop"
                ) {
                  this.goToDoor(344);
                }
                break;
            }
          }
          await this.sleep(1500);
        }
      })();
    }
    shopAcceptDelay() {
      shop_accept();
    }
    shopCloseDelay() {
      shop_close();
    }
    async shopTransaction(name, amount, tpToBuy) {
      //buy mix and teleport
      // TODO
      //kupowanie teleportów i wracanie na expo
      const teleportCounter = Object.values(g.item).filter(
        (item) => item.name === "Zwój teleportacji na Kwieciste Przejście"
      ).length;
      const potionCounter = Object.values(g.item).filter(
        (el) => el.name === name
      ).length;
      const findItemToBuy = Object.values(g.item).find(
        (item) => item.loc === "n" && item.name === name
      );
      if (
        potionCounter <= this.settings.amountMix &&
        g.shop.b.length <= 0 &&
        findItemToBuy
      ) {
        g.shop.b.push({ id: findItemToBuy.id, q: amount });
      }
      //sell
      const toSell = Object.values(g.item)
        .filter(
          (item) =>
            this.settings.toSellArr.includes(item.name) && item.loc === "g"
        )
        .map((item) => item.id);
      toSell.forEach((item, index) => {
        if (!g.shop.s.includes(toSell[index])) {
          g.shop.s.push(toSell[index]);
          toSell.splice(index, 1);
        }
      });
      if (g.shop.b.length === 1 || toSell.length > 0) {
        await this.sleep(1000);
        this.shopAcceptDelay();
      }
      if (potionCounter >= 5 && !toSell.length) {
        await this.sleep(3000);
        this.shopCloseDelay();
        storage.set("sellProcess", 3);
      }
    }
    goToDoor(id) {
      for (const door of Object.entries(g.gwIds)) {
        const doorId = door[0];
        const cordsArr = door[1].split(".").map((value) => {
          return parseInt(value);
        });
        const cords = { x: cordsArr[0], y: cordsArr[1] };
        if (id == doorId) {
          if (!map.hce(cords, hero)) {
            _g("walk");
          }
          this.searchPath(cords.x, cords.y);
          return true;
        }
      }
      return false;
    }
    findBestMob(min, max) {
      return window.npcArr
        .filter(
          (npc) =>
            npc.lvl >= min && npc.lvl <= max && !npc.walkover && npc.realDist
        )
        ?.sort((a, b) => {
          const distA = a.realDist;
          const distB = b.realDist;
          return distA > distB ? 1 : distA === distB ? 0 : -1;
        })[0];
    }
    handlerE2() {
      for (const mobLoop of Object.values(g.npc)) {
        if (mobLoop.wt > 19 && mobLoop.wt > 78 && mobLoop.fake !== true) {
          this.e2Mob = mobLoop;
        }
      }
      return this.e2Mob;
    }
    attack(bM) {
      if (Math.sqrt((bM.x - hero.x) ** 2 + (bM.y - hero.y) ** 2) <= 1) {
        _g(`fight&a=attack&ff=1&id=-${bM.id}`);
      }
    }
    exp() {
      (async () => {
        while (true) {
          if (this.settings.buttonExp === "Wyłącz!") {
            const nextGw = window.getCordsOfNextGw(this.settings.expMaps);
            if (!this.bestMob && nextGw) {
              this.bestMob = this.findBestMob(40, 50);
            } else if (nextGw && !(this.bestMob.id in window.npcArr)) {
              delete this.bestMob;
            } else if (nextGw && this.bestMob.id) {
              this.attack(this.bestMob);
            }
            if (this.bestMob) {
              this.searchPath(this.bestMob.x, this.bestMob.y);
            } else if (!this.bestMob && nextGw) {
              if (!this.findBestMob(40, 50))
                this.searchPath(nextGw.x, nextGw.y);
            } else if (!nextGw) {
              this.goToDoor(
                this.settings.expBack[this.settings.expBack.indexOf(map.id) + 1]
              );
            }
            if (!nextGw && !this.settings.expBack.includes(map.id)) {
              window.message("Błędny setup!");
            }
          }
          await this.sleep(this.settings.delay);
        }
      })();
    }
    attackE2() {
      (async () => {
        while (true) {
          if (this.settings.buttonE2 === "Wyłącz!") {
            if (!this.e2Mob) {
              this.e2Mob = this.handlerE2();
            } else if (!(this.e2Mob.id in g.npc)) {
              delete this.e2Mob;
            } else {
              this.attack(this.e2Mob);
              await this.sleep(1500);
            }
            if (this.e2Mob) {
              this.searchPath(e2Mob.x, e2Mob.y);
            }
          }
          await this.sleep(this.settings.delay);
        }
      })();
    }
    goBackE2() {
      (async () => {
        while (true) {
          if (this.settings.buttonBack === "Wyłącz!") {
            this.goToDoor(
              this.settings.backE2Maps[
                this.settings.backE2Maps.indexOf(map.id) + 1
              ]
            );
            switch (map.id) {
              case 1149:
                this.talkToNpc(162544);
                this.clickText("Przepuść mnie");
                break;
            }
          }
          await this.sleep(1500);
        }
      })();
    }
    findingHeros() {
      const handler = {
        116: [{ x: 35, y: 3 }],
        2730: [
          { x: 48, y: 11 },
          { x: 33, y: 60 },
        ],
        116: [{ x: 25, y: 57 }],
      };
      // const checkedCords = storage.get("checked")
      //   ? storage.get("checked")
      //   : {
      //       116: [],
      //       2730: [],
      //     };
      const checkedCords = {
        116: [],
        2730: [],
      };
      const maps = [1, 8, 116, 2730, 116];
      (async () => {
        while (true) {
          if (this.settings.buttonHeros === "Wyłącz!") {
            if (handler.hasOwnProperty(map.id)) {
              for (const [index, cords] of Object.entries(handler[map.id])) {
                if (
                  cords.x === hero.x &&
                  cords.y === hero.y &&
                  checkedCords[map.id].length < handler[map.id].length
                ) {
                  checkedCords[map.id].push({ x: cords.x, y: cords.y });
                }
                let didCheck = false;
                for (const [index2, checked] of Object.entries(
                  checkedCords[map.id]
                )) {
                  if (checked.x === cords.x && checked.y === cords.y) {
                    didCheck = true;
                    //storage.set("checked", checkedCords);
                    break;
                  }
                }
                if (didCheck) {
                  continue;
                }
                kamiloBot.searchPath(cords.x, cords.y);
              }
            }
            if (!handler.hasOwnProperty(map.id)) {
              //domyślnie pętla
              const nextGw = window.getCordsOfNextGw(maps);
              this.searchPath(nextGw.x, nextGw.y);
            }
          }
          await this.sleep(1500);
        }
      })();
    }
    talkToNpc(id) {
      const npc = g.npc[id];
      if (!npc) {
        return false;
      }
      if (map.hce(hero, npc) > 1) {
        this.searchPath(npc.x, npc.y);
        return true;
      } else {
        _g(`talk&id=${npc.id}`);
        return true;
      }
    }
    clickText(text) {
      const dialogNodeList = dialog.querySelectorAll("#replies.replies li");
      if (!g.talk.id || !dialogNodeList.length) {
        return false;
      }
      dialogNodeList.forEach((li, index) => {
        if (li.textContent.includes(text)) {
          dialogNodeList[index].click();
          return true;
        }
      });
    }
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    init() {
      window.bB = () => {};
      this.createDiv();
      this.exp();
      this.goBackE2();
      this.attackE2();
      this.selling();
      this.findingHeros();
    }
    draggable(a, b) {
      const c = this,
        d =
          `undefined` != typeof window.orientation ||
          -1 !== navigator.userAgent.indexOf(`IEMobile`);
      (a.ondragstart = () => {}),
        a.addEventListener(d ? `touchstart` : `mousedown`, (b) => {
          window.g.lock.add(`ktj_click`);
          [`INPUT`, `TEXTAREA`].includes(b.target.tagName) ||
            ((c.drag = !0),
            d && ((c.x = b.touches[0].pageX), (c.y = b.touches[0].pageY)),
            (c.start_x = c.x - a.offsetLeft),
            (c.start_y = c.y - a.offsetTop));
        }),
        document.addEventListener(d ? `touchmove` : `mousemove`, (b) => {
          if (
            (b.pageX && ((c.x = b.pageX), (c.y = b.pageY)),
            d && ((c.x = b.touches[0].pageX), (c.y = b.touches[0].pageY)),
            c.drag)
          ) {
            let b = a.offsetWidth,
              d = a.offsetHeight,
              e = c.x - c.start_x,
              f = c.y - c.start_y;
            0 > e && (e = 0),
              e + b > window.innerWidth && (e = window.innerWidth - b),
              (a.style.left = `${e}px`),
              0 > f && (f = 0),
              f + d > window.innerHeight && (f = window.innerHeight - d),
              (a.style.top = `${f}px`);
          }
        }),
        document.addEventListener(d ? `touchend` : `mouseup`, () => {
          window.g.lock.remove(`ktj_click`),
            storage.set(b, JSON.stringify([a.style.left, a.style.top])),
            (c.drag = !1);
        });
    }
  })();
  const checkIfGameStarted = async () => {
    if (!map && !g && !g.npc) {
      await this.sleep(300);
      checkIfGameStarted();
      return false;
    }
    window.kamiloBot.init();
  };
  g.loadQueue.push({ fun: checkIfGameStarted, data: "" });
})();
