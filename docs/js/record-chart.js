import { initially_scheduled, isGameOf, getOpponentOf, isCompleted, } from "utils.js";
import { get_logos } from "logos.js";

/**
 * @description Creates an Intl.DateTimeFormat object for formatting dates and times in Los Angeles time.
 * @constant
 * @type {Intl.DateTimeFormat}
 */
const losAngelesTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
});

function radToDeg(rad) {
  return (rad * 180.0) / Math.PI;
}

function update_record({ svg, targetTeam }) {
  const win = [...svg.querySelectorAll(`circle[data-winner="${targetTeam.clubName}"]`)].length;
  const loss = [...svg.querySelectorAll(`circle[data-loser="${targetTeam.clubName}"]`)].length;
  svg.querySelector("#Record text").textContent = `${win}-${loss}`;
}

function update_opLogos({ team, svg, opponents, rOffset, z, logos, numSeries, numInterLeague }) {
  const opLogos = opponents
    .filter((t) => svg.querySelector(`#gGames circle[data-opponent="${t.clubName}"]`))
    .map((opTeam) => {
      const len = z * (rOffset - .75);
      const isSameLeague = team.league === opTeam.league;
      const size = isSameLeague ? 80 : 65;
      const opLogo = logos[opTeam.clubName];
      opLogo.setAttribute("width", size);
      opLogo.setAttribute("height", size);
      const grp = svg.querySelector("#opLogo g").cloneNode(true);
      grp.replaceChildren(opLogo);
      const pos = [...svg.querySelectorAll(`[data-opponent="${opTeam.clubName}"]`)]
        .map((c) => Number(c.dataset.pos))
        .reduce((a, c, i, ary) => {
          a += c;
          if (i === ary.length - 1) return (a / ary.length);
          return a;
        }, 0);
      const angle = 2 * (pos / numSeries) * Math.PI + ((numInterLeague - 1) / numSeries) * Math.PI;
      const flip = isSameLeague ? Math.PI : Math.PI;
      grp.setAttribute("transform", `translate(${len * Math.sin(angle)},${len * Math.cos(angle)}) rotate(${-radToDeg(angle + flip)}) translate(${-0.5 * size},${-0.5 * size})`);
      return grp;
    });
  svg.querySelector("#opLogo").replaceChildren(...opLogos);
}

function add_winner({ svg, myGames, targetTeam }) {
  myGames
    .filter(isCompleted)
    .filter((g) => g.status !== "Cancelled")
    .forEach((g) => {
      const winner = ["away", "home"].map((ah) => g.teams[ah]).find((t) => t.isWinner);
      const loser = ["away", "home"].map((ah) => g.teams[ah]).find((t) => !t.isWinner);
      const dot = svg.querySelector(`circle[data-game-pk="${g.gamePk}"]`);
      dot.dataset.winner = winner.team;
      dot.dataset.loser = loser.team;
      if (loser.team === targetTeam.clubName) { dot.classList.add("lost") }
      ["venue", "gamePk", "officialDate"].forEach((item) => {
        if (typeof g[item] === "undefined") return;
        dot.dataset[item] = g[item];
      });
      if (g.doubleHeader === "Y") dot.dataset.doubleheader = g.gameNumber;
      const score = g.teams.home.hasOwnProperty("score") ? `${g.teams.away.team} ${g.teams.away.score}, ${g.teams.home.team} ${g.teams.home.score}` : "";
      dot.dataset.score = score; // MLB Gameday: Mets 0, Dodgers 10 Final Score (04/21/2024)
    });
  update_record({ svg, targetTeam });
}

function update_season({ svg, season }) {
  svg.querySelector("#season text").textContent = season;
}

function update_teamLogo({ logo, grp, size = 500 }) {
  logo.setAttribute("width", size);
  logo.setAttribute("height", size);

  grp.replaceChildren(logo);
  grp.setAttribute("transform", `translate(-${0.5 * size},-${0.5 * size})`);
}

function add_opIdx(opponents) {
  return function (game, idx, _) {
    game.opIdx = opponents.findIndex((t) => t.clubName === game.opponent)
    return game;
  }
}

/**
 * @description Creates a comparator function to sort an array of teams by division, prioritizing teams in the same league as the target team.
 * @function byDivision
 * @param {object} team - The target team object, used to determine league priority.
 * @returns {function} - A comparator function suitable for Array.sort().
 * @example
 * teams.sort(byDivision(targetTeam));
 */
function byDivision(team) {
  return function (a, b) {
    const [criteriaA, criteriaB] = [a, b]
      .map((t) => {
        const divs = ["East", "Central", "West"];
        if (t.league === team.league) {
          return divs.indexOf(t.division.split(" ").at(-1));
        } else {
          return 5 + divs.reverse().indexOf(t.division.split(" ").at(-1));
        }
      });
    if (criteriaA > criteriaB) return 1;
    if (criteriaA < criteriaB) return -1;
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  };
}

const create_arc = ({ path, start, end, distance, numSeries = 52, clockwise = 0, largeArcFlag = 0, sweepFlag = 1, numInterLeague }) => {

  const angles = [start, end].map(pos => 2 * (pos / numSeries) * Math.PI + ((numInterLeague - 1) / numSeries) * Math.PI);
  const x = angles.map((r) => distance * Math.sin(r));
  const y = angles.map((r) => distance * Math.cos(r));
  const d = `M ${x[0]} ${y[0]} A ${distance} ${distance} ${clockwise} ${largeArcFlag} ${sweepFlag} ${x[1]} ${y[1]}`;
  path.setAttribute("d", d);
  return path;
}

function update_arcs({ svg, targetTeam, opponents, rOffset, z, numSeries, numInterLeague }) {
  const team = targetTeam.clubName;
  const path = svg.querySelector("#elements path");

  const arcs = opponents
    .filter((t) => svg.querySelector(`#gGames circle[data-opponent="${t.clubName}"]`))
    .map((opponent) => {
      const dots = [...svg.querySelectorAll(`[data-opponent="${opponent.clubName}"]`)];
      const obj = {
        id: `arc${opponent.clubName.replace(/ /g, "")}`,
        dots, opponent,
        fill: opponent.clubName,
        distance: rOffset + 4.85
      };
      return [obj, Object.assign({}, obj, { id: `inner${obj.id}`, distance: rOffset + 0.15 })];
    })
    .flat()
    .concat(
      [
        { league: "American League", division: "West" },
        { league: "American League", division: "Central" },
        { league: "American League", division: "East" },
        { league: "National League", division: "West" },
        { league: "National League", division: "Central" },
        { league: "National League", division: "East" },
      ].map(({ league, division }) => {
        const dots = [...svg.querySelectorAll(`[data-opponent]`)]
          .filter((dot) => opponents.find((t) => t.clubName === dot.dataset.opponent).league === league)
          .filter((dot) => opponents.find((t) => t.clubName === dot.dataset.opponent).division.split(" ").at(-1) === division)
          ;
        return {
          id: `${league} ${division}`.replace(/ /g, ""),
          dots,
          league,
          division,
          fill: league,
          distance: rOffset + 6.2
        }
      })
    )
    .flat()
    .filter(({ dots }) => dots.length > 0) // remove divisions without games
    .map(({ id, dots, distance, fill }) => {
      const win = dots.filter((dot) => dot.dataset.winner === team).length;
      const loss = dots.filter((dot) => dot.dataset.loser === team).length;
      const positions = dots.map((dot) => Number(dot.dataset.pos));
      const [start, end] = [Math.max(...positions), Math.min(...positions)];
      const ext = 0.25 + (distance / (rOffset + 100));
      // 50%を超えたらlargeArcFlagを1にする？
      const largeArcFlag = Math.abs(start - end) / numSeries > .5 ? 1 : 0;
      const arc = create_arc({ path: path.cloneNode(), start: start + ext, end: end - ext, distance: z * distance, largeArcFlag, numSeries, numInterLeague });
      arc.classList.add("arc");
      arc.dataset.win = win;
      arc.dataset.loss = loss;
      arc.dataset.fill = fill;
      arc.id = id;
      arc.dataset.games = dots.length;
      return arc;
    });
  svg.querySelector("#gArcs").replaceChildren(...arcs);
}

function update_divRecords({ svg }) {
  const divRecords = [...svg.querySelectorAll("#gArcs path")]
    .filter((arc) => !arc.id.includes("inner"))
    .map((arc) => ({ arc, svg }))
    .map(add_win_loss_to_arc);
  svg.getElementById("gDivRecords").replaceChildren(...divRecords);
}

function add_win_loss_to_arc({ svg, arc }) {
  const text = ["win", "loss"].map((item) => Number(arc.dataset[item])).join("-");
  const textNode = svg.querySelector("#elements .record").cloneNode(true);
  const textPath = textNode.querySelector("textPath");
  textPath.setAttribute("href", `#${arc.id}`);
  textPath.textContent = text;
  if (svg.querySelector("#Record text").textContent === "0-0") {
    //textPath.textContent = arc.dataset.games;
  }
  return textNode;
}

const svgTemplate = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="none" viewBox="-1200 -1200 2400 2400">
  <style data-css="external"></style>
  <style>
    #bgRect {
      fill: var(--bgcolor, cornsilk);
    }
    circle {
      fill: var(--team-color, var(--bgcolor, cornsilk));
      r: 30px;
      stroke-width: 4px;
      stroke: var(--team-shadow-color, var(--team-color, black));
    }
    circle.lost {
      r: 24px;
    }
    circle:hover {
      cursor: pointer;
    }
    text {
      font-family: 'Noto Sans', sans-serif;
    }
    .arc {
      fill: none;
      stroke-width: 20px;
      stroke: var(--team-color, black);
      stroke-linecap: round;
    }
    .arc[data-fill="American League"],
    .arc[data-fill="National League"]{
      stroke-width: 10px;
    }
    .record {
      font-size: 50px;
      text-anchor: middle;
    }
    #Record text {
      text-anchor: middle;
      alignment-baseline: middle;
      font-size: 120px;
    }
    #season text {
      text-anchor: middle;
      alignment-baseline: middle;
      font-size: 120px;
    }
    #elements {
      display: none;
    }
  </style>
    <g id="elements">
    <path />
    <text class="record" dy="-30">
      <textPath startOffset="50%">0-0</textPath>
    </text>
    <circle cx="0" cy="0" />
    <g></g>
  </g>
  <rect x="-1200" y="-1200" width="2400" height="2400" stroke="none" id="bgRect"/>
  <g data-team="" data-season="">
  <g id="gArcs"></g>
  <g id="gDivRecords"></g>
  <g id="gGames"></g>
  <g id="teamLogo"></g>
  <g id="Record">
    <text x="0" y="360">0-0</text>
  </g>
  <g id="season">
    <text x="0" y="-360"></text>
  </g>
  <g id="opLogo"><g></g></g>
  </g>
</svg>
`;

class RecordChart extends HTMLElement {
  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();
    const self = this;
    const root = self.attachShadow({ mode: "open" });

    const css = [
      `<style>:host { display: block; height: 100%;} svg { display: block; }</style>`,
      `<link rel="stylesheet" href="${(new URL('../css/mlb2026-colors.css', import.meta.url)).href}">`,
      `<link rel="stylesheet" href="${(new URL('../css/mlb2026-color-legend.css', import.meta.url)).href}">`
    ].join("\n");
    const html = `${svgTemplate}`;
    root.innerHTML = `${css}${html}`;
    const mainGrp = root.querySelector(`g[data-team]`);

    // <g data-team="" data-season=""> mutation observer
    const observer = new MutationObserver(mutations => {
      const target = mutations[0].target;
      if (target.dataset.season.length && target.dataset.team.length) {
        self.draw_chart();
      }
    });
    observer.observe(mainGrp, {
      attributes: true,
    });

    document.addEventListener("SeasonDataLoaded", async ({ detail }) => {
      self.season = detail.season;
      self.teams = detail.teams;
      self.games = detail.games;
      mainGrp.dataset.season = self.season;
    });
  }

  draw_chart() {
    const self = this;
    const { season, teams, games, clubName } = self;
    const targetTeam = self.teams.find((t) => t.clubName === clubName);
    const svg = this.shadowRoot.querySelector("svg");
    update_season({ svg, season });
    const opponents = teams
      .filter((t) => t.name !== targetTeam.name)
      .sort(byDivision(targetTeam))
      ;

    const scheduled = games
      .filter(isGameOf(targetTeam))
      .filter(initially_scheduled)
      .map((g) => Object.assign({}, g, {
        date: losAngelesTimeFormatter.format(new Date(g.gameDate)),
        opponent: getOpponentOf(targetTeam)(g),
        me: ["away", "home"].map((rh) => g.teams[rh]).find((t) => t.team === targetTeam.clubName),
      }))
      .map(add_opIdx(opponents))
      .sort((a, b) => a.opIdx - b.opIdx)
      ;[].map((g) => {
        return g;
      })
      ;

    const numSeries = Math.max(...scheduled.map((g) => g.me.chartPos));
    scheduled.forEach((g, i) => {
      g.pos = g.me.chartPos;
    });
    const [z, rOffset] = [78, 8];
    const otherLeagueTeams = teams.filter((t) => t.league !== targetTeam.league).map((t) => t.clubName);
    const numInterLeague = scheduled
      .filter((g) => otherLeagueTeams.includes(g.opponent))
      .filter((g) => g.seriesGameNumber === 1)
      .length;

    const dots = teams
      .map((op) => {
        return scheduled
          .filter((g) => g.opponent === op.clubName)
          .map((g) => {
            const angle = 2 * (g.pos / numSeries) * Math.PI + ((numInterLeague - 1) / numSeries) * Math.PI;
            const x = z * (rOffset + g.seriesGameNumber) * Math.sin(angle);
            const y = z * (rOffset + g.seriesGameNumber) * Math.cos(angle);
            const dot = svg.querySelector("#elements circle").cloneNode(true);
            ["date", "venue", "gamePk", "opponent", "opIdx", "pos", "officialDate"].forEach((item) => {
              if (typeof g[item] === "undefined") { console.log(item); return; }
              dot.dataset[item] = g[item];
            });
            const score = g.teams.home.hasOwnProperty("score") ? `${g.teams.away.team} ${g.teams.away.score}, ${g.teams.home.team} ${g.teams.home.score}` : "";
            dot.dataset.score = score;
            dot.setAttribute("transform", `translate(${Math.trunc(x)},${Math.trunc(y)})`);

            dot.addEventListener("click", ({ currentTarget }) => {
              const dots = [...svg.querySelectorAll(`[data-op-idx="${currentTarget.dataset.opIdx}"]`)]
                .map((d) => d.dataset);
              document.dispatchEvent(new CustomEvent("SeriesSelected", { detail: dots }));
            })
            return dot;
          })
      })
      .flat()
      ;
    svg.querySelector("#gGames").replaceChildren(...dots);
    update_teamLogo({ logo: get_logos(season)[targetTeam.clubName], grp: svg.querySelector("#teamLogo") })
    update_opLogos({ team: targetTeam, svg, opponents, rOffset, z, logos: get_logos(season), numSeries, numInterLeague });

    setTimeout(() => {
      add_winner({ svg, myGames: games.filter(isGameOf(targetTeam)), targetTeam });
      update_arcs({ svg, targetTeam, opponents, rOffset, z, numSeries, numInterLeague });
      update_divRecords({ svg, season });
    }, 100);
  }

  connectedCallback() {
    const self = this;

    document.addEventListener("ROUTED", ({ detail }) => {
      self.clubName = detail.clubName;
      self.shadowRoot.querySelector(`g[data-team]`).dataset.team = detail.clubName;
    });

  }

  attributeChangedCallback(name, oldValue, newValue) { }
}

customElements.define("record-chart", RecordChart);
export { RecordChart }
