import { fileURLToPath } from 'url';
const __dirname = import.meta.dirname;

import { readFile, writeFile } from 'node:fs/promises';
import { isGameOf, initially_scheduled, getOpponentOf } from '../docs/js/utils.js';

const season = process.argv.slice(2).at(0) || "2026";

const infile = import.meta.resolve(`${__dirname}/../Schedule/mlb-schedule-${season}.json`);
const inputs = JSON.parse(await readFile(fileURLToPath(infile), "utf8"));
const teamsFile = import.meta.resolve(`${__dirname}/../docs/mlb-games-${season}.json`);
const teams = JSON.parse(await readFile(fileURLToPath(teamsFile, "utf8"))).teams;

const games = inputs
  .map((g) => {
    g.venue = g.venue.name;
    g.teams.away.team = teams.find((t) => t.name === g.teams.away.team.name).clubName;
    g.teams.home.team = teams.find((t) => t.name === g.teams.home.team.name).clubName;
    return g;
  })
  .map(remove_unused)
  ;

const scheduled = games
  .filter(initially_scheduled)
  ;

const losAngelesTimeFormatter = Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });
teams
  .forEach((targetTeam) => {
    const opponents = teams
      .filter((t) => t !== targetTeam)
      .sort(byDivision(targetTeam))
      ;
    scheduled
      .filter(isGameOf(targetTeam))
      .map((g) => Object.assign({}, g, {
        date: losAngelesTimeFormatter.format(new Date(g.gameDate)),
        opponent: getOpponentOf(targetTeam)(g),
        me: ["away", "home"].map((rh) => g.teams[rh]).find((t) => t.team === targetTeam.clubName),
        matchup: ["away", "home"].map((ah) => g.teams[ah].team).join(" vs "),
      }))
      .map(add_opIdx(opponents))
      .reduce((acc, _, idx, ary) => {
        if (idx === ary.length - 1) {
          return groupBySeries(ary);
        } else {
          return acc;
        }
      }, [])
      .map((series) => {
        if (series.length < 5) return [series];
        return [
          series.slice(0, 3),
          series.slice(3)
        ];
      })
      .flat()
      .forEach((series, seriesNumber) => {
        series
          .forEach((g, seriesGameNumber) => {
            const game = games.find((game) => game.gamePk === g.gamePk && game.gameDate === g.gameDate);
            game.me = ["away", "home"].map((rh) => game.teams[rh]).find((t) => t.team === targetTeam.clubName);
            game.me.chartPos = 1 + seriesNumber;
            game.me = undefined;
            game.seriesGameNumber = 1 + seriesGameNumber;
          })
      })
  });

const outfile = import.meta.resolve(`${__dirname}/../docs/mlb-games-${season}.json`);
const output = JSON.stringify({ season, teams, games }, null, 2);
await writeFile(fileURLToPath(outfile), output);

function add_opIdx(opponents) {
  return function (game, idx, _) {
    game.opIdx = opponents.findIndex((t) => t.clubName === game.opponent)
    return game;
  }
}

function remove_unused(item, idx, ary) {
  [
    "gameGuid", "link", "gameType", "content",
    "isTie", "publicFacing", "gamedayType", "tiebreaker",
    "calendarEventID", "seasonDisplay", "dayNight", "scheduledInnings",
    "reverseHomeAwayStatus", "inningBreakLength", "recordSource",
    "ifNecessary", "ifNecessaryDescription", "seriesDescription",
  ].forEach((key) => {
    delete item[key];
  });
  item.status = item.status.detailedState;
  if (item.doubleHeader === "N") {
    delete item.doubleHeader;
    delete item.gameNumber;
  }
  ["away", "home"].forEach((ah) => {
    delete item.teams[ah].leagueRecord;
    delete item.teams[ah].splitSquad;
    delete item.teams[ah].team.id;
    delete item.teams[ah].team.link;
  })
  return item;
}

function byDivision(team = { league: "American League" }) {
  return function (a, b) {
    const [criteriaA, criteriaB] = [a, b]
      .map((t) => {
        const divs = ["East", "Central", "West"];
        if (t.league === team.league) {
          return divs.indexOf(t.division.split(" ").at(-1));
        } else {
          return 5 + divs.reverse().indexOf(t.division.split(" ").at(-1));
        }
      })
    if (criteriaA > criteriaB) return 1;
    if (criteriaA < criteriaB) return -1;
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  }
}

function heldInUK_KR(game) {
  return ["London Stadium", "Gocheok Sky Dome"].includes(game.venue);
}

function groupBySeries(games) {
  const grpOp = Object.values(Object.groupBy(games, (g) => g.opIdx))
    .map((seasonSeries) => {
      const uk_kr = seasonSeries.filter(heldInUK_KR);
      // split home and road
      const [gHome, gRoad] = Object.values(Object.groupBy(seasonSeries.filter((g) => !heldInUK_KR(g)), (g) => g.teams.home.team));
      return [[uk_kr], [gHome], [gRoad]].filter((grp) => grp[0])
        .flat()
        .map((series) => {
          return series
            .reduce((acc, cur, idx, ary) => {
              if (idx === 0) return [[cur]];
              const last = acc.at(-1).at(-1);
              if (new Date(cur.gameDate) - new Date(last.gameDate) < 3 * 24 * 60 * 60 * 1000) {
                acc.at(-1).push(cur);
              } else if (new Date(cur.gameDate) - new Date(last.gameDate) > 3 * 24 * 60 * 60 * 1000) {
                acc.push([cur]);
              } else if (ary.length < 5) {
                acc.at(-1).push(cur);
              } else {
                acc.push([cur]);
              }
              return acc;
            }, [])

        })
        .flat()
    })
    .flat()
    .sort((a, b) => {
      if (a[0].opIdx < b[0].opIdx) return -1;
      if (a[0].opIdx > b[0].opIdx) return 1;
      if (a[0].gameDate < b[0].gameDate) return -1;
      if (a[0].gameDate > b[0].gameDate) return 1;
      return 0;
    })
    .map((o, i) => {
      //console.log('x', i, o.length, o[0].gameDate, o[0].matchup)
      return o;
    })
  return grpOp;
}
