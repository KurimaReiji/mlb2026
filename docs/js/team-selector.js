import { get_logos } from "logos.js";

const teamsAvailable = [
  "Orioles",
  "Red Sox",
  "Yankees",
  "Rays",
  "Blue Jays",
  "White Sox",
  "Guardians",
  "Tigers",
  "Royals",
  "Twins",
  "Astros",
  "Angels",
  "Athletics",
  "Mariners",
  "Rangers",
  "Braves",
  "Marlins",
  "Mets",
  "Phillies",
  "Nationals",
  "Cubs",
  "Reds",
  "Brewers",
  "Pirates",
  "Cardinals",
  "Diamondbacks",
  "Rockies",
  "Dodgers",
  "Padres",
  "Giants",
  "Indians",
];

class TeamSelector extends HTMLElement {
  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();

    document.addEventListener("SeasonDataLoaded", async ({ detail }) => {
      this.render_teams(detail);
    });
  }

  render() {
    const css = `<style>
    :host {
      font-family: 'Noto Sans', Arial, sans-serif;
      min-width: 200px;
      display: block;
      container-type: inline-size;
    }
    .selector {
      --grid-template: auto / repeat(5, 1fr);
    }
    [data-team]:nth-of-type(n+16):nth-of-type(-n+20){
      margin-top: 1em;
    }
    @container (min-width: 40em) {
      .selector {
        --grid-template: auto / repeat(15, 1fr);
      }
      [data-team]:nth-of-type(n+16):nth-of-type(-n+30){
        margin-top: 1em;
      }
    }
    .selector svg {
      width: min(40px, 75%);
      aspect-ratio: 1 / 1;
      display: block;
      margin-inline: auto;
    }
    .selector {
      padding-block: min(2vh, 1em) min(2vh, .5em);
      padding-inline: 2em;
      margin-inline: auto;
      display: grid;
      grid-template: var(--grid-template);
    }
    .selector .clickable {
      aspect-ratio: 1 / 1;
      display: grid;
      place-content: center center;
      height: min(12vh, 36px);
      margin-inline: auto;
    }
    .clickable {
      cursor: pointer;
    }
    </style>`;
    const html = `
    <div class="selector">
      <div data-grid="AL"></div>
      <div data-grid="NL"></div>
    </div>
    `;
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `${css}${html}`;
  }

  render_teams({ season, teams }) {
    const root = this.shadowRoot;
    const logos = get_logos(season);

    const teamLogos = teams
      .sort((a, b) => { // from AL East to NL West
        const divs = ["East", "Central", "West"];
        const [aa, bb] = [a, b]
          .map((t) => `${t.league}${divs.indexOf(t.division.split(" ").at(-1))}${t.name}`)
          ;
        if (aa < bb) return -1;
        if (aa > bb) return 1;
        return 0;
      })
      .map((team) => {
        return {
          team,
          logo: logos[team.clubName]
        }
      })
      .map(({ team, logo }) => {
        const div = document.createElement("div");
        div.dataset.team = team.clubName;
        ["league", "division"].forEach((item) => {
          div.dataset[item] = team[item];
        })
        div.classList.add("clickable");
        div.append(logo);
        return div;
      });

    root.querySelector(".selector").replaceChildren(...teamLogos);

    [...root.querySelectorAll('.selector [data-team]')].forEach((div) => {
      div.addEventListener("click", ({ currentTarget }) => {
        const team = currentTarget.dataset.team;
        document.dispatchEvent(new CustomEvent("TeamSelected", {
          detail: {
            targetTeam: teams.find((t) => team === t.clubName),
          }
        }))
      });
    });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) { }
}

customElements.define("team-selector", TeamSelector);
export { TeamSelector, teamsAvailable };

