OPERATION_TIMEOUT_MS = 10;

function getRosterRows(container) {
    const tableBodies = container.querySelectorAll("tbody.Table2__tbody");
    const starterTable = tableBodies[0];
    const benchTable = tableBodies[2];
    const starterRows = starterTable.getElementsByTagName("tr");
    const benchRows = benchTable.getElementsByTagName("tr");
    return {
        starterRows: Array.from(starterRows).slice(0, starterRows.length - 1), // There's a sum row at the bottom of the starter table.
        benchRows: Array.from(benchRows),
    };
}

function parseSlotType(text) {
    switch (text) {
        case "PG": return SLOT_TYPE_POINT_GUARD;
        case "SG": return SLOT_TYPE_SHOOTING_GUARD;
        case "SF": return SLOT_TYPE_SMALL_FORWARD;
        case "PF": return SLOT_TYPE_POWER_FORWARD;
        case "C": return SLOT_TYPE_CENTER;
        case "G": return SLOT_TYPE_GUARD;
        case "F": return SLOT_TYPE_FORWARD;
        case "UTIL": return SLOT_TYPE_UTIL;
        default: throw new Error("Unknown slot type: " + text);
    }
}

function createActivePlayerSlot(row, slotId) {
    const slotCell = row.getElementsByTagName("td")[0];
    const slotType = parseSlotType(slotCell.textContent);
    return new ActivePlayerSlot(slotId, slotType);
}

function parsePlayerId(playerInfoCell) {
    // The only place we can reliably find the player ID is in the image.
    // For players that don't have headshots (typically rookies) there's no way to get the ID here.
    const image = playerInfoCell.getElementsByTagName("img")[0];
    const match = /.*\/(\d+)\.png.*/.exec(image.src);
    return match ? Number.parseInt(match[1]) : null;
}

function parsePositions(playerInfoCell) {
    const span = playerInfoCell.getElementsByClassName("playerinfo__playerpos")[0];
    return span.textContent.split(", ").map(s => s.trim());
}

function parseHealth(playerInfoCell) {
    const healthSpan = playerInfoCell.getElementsByClassName("playerinfo__injurystatus")[0];
    const healthString = healthSpan ? healthSpan.textContent : "";
    switch (healthString) {
        case "DTD": return PLAYER_HEALTH_DAYTODAY;
        case "O": return PLAYER_HEALTH_OUT;
        case "SSPD": return PLAYER_HEALTH_SUSPENDED;
        default: return PLAYER_HEALTH_HEALTHY;
    }
}

function parseOpponent(row) {
    const matchupCell = row.getElementsByTagName("td")[3];
    const matchupDiv = matchupCell.getElementsByTagName("div")[0];
    if (!matchupDiv) {
        return null;
    }
    const opponentTeamLink = matchupDiv.getElementsByTagName("a")[0];
    return opponentTeamLink ? opponentTeamLink.textContent : null;
}

function createPlayer(row) {
    const playerInfoCell = row.getElementsByTagName("td")[1];
    const playerLink = playerInfoCell.getElementsByTagName("a")[0];
    if (!playerLink) {
        // This should mean that the slot is currently empty.
        return null;
    }
    const playerId = parsePlayerId(playerInfoCell);
    const name = playerLink.textContent;
    const positions = parsePositions(playerInfoCell);
    const health = parseHealth(playerInfoCell);
    const opponent = parseOpponent(row);
    return new Player(playerId, name, positions, health, opponent);
}

function getRosterState() {
    const mainTable = document.querySelector(".container > .team-page > div:nth-child(3)");
    const { starterRows, benchRows } = getRosterRows(mainTable);
    const slots = [];
    const players = [];
    const mapping = new Map();
    let slotId = 0;
    for (const row of starterRows) {
        const slot = createActivePlayerSlot(row, slotId++);
        slots.push(slot);
        const player = createPlayer(row);
        if (player !== null) {
            players.push(player);
        }
        mapping.set(slot.slotId, player);
    }
    for (const row of benchRows) {
        const player = createPlayer(row);
        if (player !== null) {
            players.push(player);
        }
    }
    return new RosterState(slots, players, mapping);
}

function getMoveButton(player) {
    return document.getElementById(`pncButtonMove_${player.playerId}`);
}

function getLockedButton(player) {
    return document.getElementById(`pncButtonLocked_${player.playerId}`);
}

function getSelectedMoveButton(player) {
    return document.getElementById(`pncButtonMoveSelected_${player.playerId}`);
}

function getHereButton(slotId) {
    const slotRow = document.getElementsByClassName("pncPlayerRow")[slotId];
    const hereButtons = Array.from(slotRow.getElementsByClassName("pncButtonHere"));
    // Sometimes invisible buttons are left behind when the slot has been touched previously.
    const visibleHereButtons = hereButtons.filter(e => e.style.display !== "none");
    // If we can't find any buttons it could be because we're attempting to move a player from a slot of the same type.
    // The ESPN page doesn't allow this.
    return visibleHereButtons.length > 0 ? visibleHereButtons[0] : null;
}

function getSubmitButton() {
    return document.getElementById("pncSaveRoster0");
}

function performMove(currentRosterState, newMapping, whenFinished) {
    if (newMapping.length === 0) {
        whenFinished();
        return;
    }
    const [[slotId, player], ...remainingMapping] = newMapping;
    const currentPlayer = currentRosterState.mapping.get(slotId);
    if (player !== null && (currentPlayer === null || currentPlayer.playerId !== player.playerId)) {
        console.debug("Moving player to slot", player, slotId);
        // Wait for a short while between sending clicks to the Move button and to the Here button.
        // Without this we get intermittent errors from the click handlers on the ESPN page.
        const moveButton = getMoveButton(player);
        if (moveButton === null) {
            const lockedButton = getLockedButton(player);
            if (lockedButton === null) {
                console.error("No Move button found, and we don't know why.")
            } else {
                console.debug("Unable to perform move because the player's slot is locked. This is probably because the player's game has already started, or is about to start.");
            }
            return;
        } else {
            moveButton.click();
        }
        setTimeout(() => {
            const hereButton = getHereButton(slotId);
            if (hereButton === null) {
                // If we can't find a Here button it's because the move isn't possible for some reason.
                // The most likely reason for this is that we're attempting to move a player in a UTIL slot to a different UTIL slot.
                // We need to "roll back" the move by clicking the Move button again, which is unfortunately a separate HTML element.
                getSelectedMoveButton(player).click();
            } else {
                hereButton.click();
            }
            setTimeout(() => performMove(currentRosterState, remainingMapping, whenFinished), OPERATION_TIMEOUT_MS);
        }, OPERATION_TIMEOUT_MS);
    } else {
        performMove(currentRosterState, remainingMapping, whenFinished);
    }
}

function performMoves(currentRosterState, newRosterState, autoSave) {
    const whenFinished = autoSave ? saveChanges : () => {};
    performMove(currentRosterState, Array.from(newRosterState.mapping), whenFinished);
}

function createAutoSetupButton() {
    const autoSetupButton = document.createElement("a");
    autoSetupButton.className = "btn btn--custom ml4 action-buttons btn--alt";
    autoSetupButton.onclick = performAutoSetup;
    const innerSpan = document.createElement("span");
    innerSpan.textContent = "Auto";
    autoSetupButton.appendChild(innerSpan);
    return autoSetupButton;
}

function addAutoSetupButton(myTeamButtonsDiv) {
    myTeamButtonsDiv.appendChild(createAutoSetupButton());
}

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        const contentNavDiv = Array.from(mutation.addedNodes).filter(n => n.classList && n.classList.contains("content-nav"))[0];
        if (!contentNavDiv) {
            continue;
        }
        const myTeamButtonsDiv = contentNavDiv.getElementsByClassName("myTeamButtons")[0];
        if (!myTeamButtonsDiv) {
            console.warn("Unable to find expected div with class name 'myTeamButtons'");
            break;
        }
        addAutoSetupButton(myTeamButtonsDiv);
    }
});
observer.observe(document.body, { childList: true, subtree: true });

function saveChanges() {
    console.debug("Saving changes");
    const button = getSubmitButton();
    button.click();
}

const currentSettings = {
    autoSave: true,
};

function updateSettings(settings) {
    console.debug("Updating extension settings", settings);
    currentSettings.autoSave = settings.autoSave;
}

function performAutoSetup() {
    console.debug("Performing auto-setup with current settings", currentSettings);
    const rosterState = getRosterState();
    const newRosterState = calculateNewRoster(rosterState);
    if (rosterState.isEquivalentTo(newRosterState)) {
        console.debug("No moves are necessary");
    } else {
        console.debug("Current active players", rosterState.mapping);
        console.debug("Suggested new active players", newRosterState.mapping);
        performMoves(rosterState, newRosterState, currentSettings.autoSave);
    }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.debug("Received message", message);
    if (message.commandId === "perform-auto-setup") {
        performAutoSetup(currentSettings.autoSave);
    } else if (message.commandId === "settings-changed") {
        updateSettings(message.settings);
    }
});