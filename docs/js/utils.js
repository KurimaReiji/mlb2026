/**
 * @description Excludes games that have been rescheduled or resumed and is intended to be used as a callback for the filter method.
 * @function initially_scheduled
 * @param {object} game - The game object.
 * @param {number} _ - Placeholder for the index, unused in this callback function for filter.
 * @returns {boolean} - Returns true if the game was initially scheduled (not rescheduled or resumed), false otherwise.
 */
function initially_scheduled(game, _) {
  return !game.hasOwnProperty("rescheduledFrom") && !game.hasOwnProperty("resumedFrom");
}

/**
 * @description Checks if a game is completed (Final, Completed Early, Game Over or Cancelled) and is intended to be used as a callback for the filter method.
 * @function isCompleted
 * @param {object} game - The game object.
 * @param {number} _ - Placeholder for the index, unused in this callback function for filter.
 * @returns {boolean} - Returns true if the game is completed, false otherwise.
 */
function isCompleted(game, _) {
  return ["Final", "Completed Early", "Game Over", "Cancelled"].includes(game.status);
}

/**
 * @description Returns a function that returns the opponent of the target team.
 * @function getOpponentOf
 * @param {object} targetTeam - The target team object.
 * @returns {function} - A function that takes a game object and returns the opponent's team name.
 */
function getOpponentOf(targetTeam) {
  return function (game) {
    return [game.teams.away.team, game.teams.home.team]
      .filter((t) => t !== targetTeam.clubName)
      .at(0);
  };
}

/**
 * @description Returns a function that checks if the game involves the target team.
 * @function isGameOf
 * @param {object} targetTeam - The target team object.
 * @returns {function} - A function that takes a game object and returns true if the game involves the target team, false otherwise.
 */
function isGameOf(targetTeam) {
  return function (game) {
    return [game.teams.away.team, game.teams.home.team]
      .includes(targetTeam.clubName);
  };
}

/**
 * @description Waits for an element matching the given selector to appear in the DOM.
 * @function waitFor
 * @param {string} selector - The CSS selector of the element to wait for.
 * @param {HTMLElement} [parent=document] - The parent element to observe for changes. Defaults to document.
 * @returns {Promise<HTMLElement>} - A promise that resolves with the found element when it appears in the DOM.
 * @see https://stackoverflow.com/a/61511955
 */
function waitFor(selector, parent) {
  if (!parent) parent = document;
  return new Promise(resolve => {
    if (parent.querySelector(selector)) {
      return resolve(parent.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (parent.querySelector(selector)) {
        resolve(parent.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(parent, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Loads the CSS rules from a given CSS link element.
 *
 * @async
 * @function loadCssRules
 * @param {HTMLLinkElement} link - The link element of the CSS file.
 * @param {Document|ShadowRoot} root - The root document or shadow root where the CSS is applied.
 * @returns {Promise<string>} A promise that resolves with the CSS rules as a string.
 */
function loadCssRules(link, root) {
  return new Promise(resolve => {
    if (link.sheet) resolve([...link.sheet.cssRules].map(r => r.cssText).join("\n"));
    link.addEventListener("load", ({ currentTarget }) => {
      const css = [...root.styleSheets].find(sheet => sheet.href === currentTarget.href);
      const rules = [...css.cssRules].map(r => r.cssText).join("\n");
      resolve(rules);
    });
  });
}

/**
 * @description Downloads an SVG as a PNG image.
 * @async
 * @function svgdownload
 * @param {string} [filename="output.png"] - The filename for the downloaded PNG.
 * @param {HTMLElement} [svg=document.querySelector("svg")] - The SVG element to download.
 * @returns {Promise<string>} - A promise that resolves with the filename when the download is complete.
 * @throws {Error} - Throws an error if any part of the process fails.
 */
async function svgdownload(filename = "output.png", svg = null) {
  svg = svg || document.querySelector("svg");
  const svgData = new XMLSerializer().serializeToString(svg);

  return new Promise(async (resolve, reject) => {
    const image = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    try {
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

      const reader = new FileReader();
      reader.onload = () => {
        image.onload = () => {
          canvas.width = image.width;
          canvas.height = image.height;

          ctx.drawImage(image, 0, 0);

          // Create download link
          var a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.setAttribute("download", filename);

          // Simulate click and resolve
          delay(400).then(() => {
            a.dispatchEvent(new MouseEvent("click"));
            console.log(`downloaded as ${filename}`);
            resolve(filename);
          });
        };

        image.onerror = (error) => {
          console.error('Image load error:', error);
          reject(new Error('Failed to load image from SVG data.'));
        };

        image.src = reader.result;
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read SVG data.'));
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error during svgdownload:', error);
      reject(error);
    }
  });
}

/**
 * @description Delays execution for a specified time.
 * @async
 * @function delay
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export {
  initially_scheduled,
  isCompleted,
  getOpponentOf,
  isGameOf,
  svgdownload,
  loadCssRules,
  waitFor,
}
