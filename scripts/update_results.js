const inputs = await fetch("https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=2026-03-25&endDate=2026-09-30&hydrate=team", { cache: "no-cache", })
  .then((response) => response.json());

const data = inputs.dates
  .map((o) => o.games)
  .flat()
  .filter((g) => g.gameType === "R" && !g.resumeGameDate)
  .filter((g) => ["Final", "Game Over", "Completed Early"].includes(g.status.detailedState))
  .map((g) => {
    return {
      gamePk: g.gamePk,
      date: g.officialDate,
      road: g.teams.away.team.teamName,
      home: g.teams.home.team.teamName,
      score: [g.teams.away.score, g.teams.home.score].join(" - "),
      status: g.status.detailedState,
    };
  })
  ;

const output = JSON.stringify(data, null, 2).replace(/D-backs/g, "Diamondbacks");
console.log(output);
