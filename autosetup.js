DEFAULT_OPERATION_TIMEOUT_MS = 1000;

function getRosterRows() {
    const tableBody = document.querySelector(".players-table tbody.Table__TBODY");
    const starterRows = [];
    const benchRows = [];
    for (const row of tableBody.getElementsByTagName("tr")) {
        const slotCell = row.getElementsByTagName("td")[0];
        const slotType = parseSlotType(slotCell.textContent);
        if (slotType === SLOT_TYPE_BENCH || slotType === SLOT_TYPE_IR) {
            benchRows.push(row);
        } else {
            starterRows.push(row);
        }
    }
    return { starterRows, benchRows };
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
        case "Bench": return SLOT_TYPE_BENCH;
        case "IR": return SLOT_TYPE_IR;
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

function parseInjuredReserve(row) {
    const positionCell = row.getElementsByTagName("td")[0];
    const positionDiv = positionCell.getElementsByTagName("div")[0];
    return positionDiv && positionDiv.textContent === "IR";
}

function createPlayer(row) {
    const playerInfoCell = row.getElementsByTagName("td")[1];
    const playerLink = playerInfoCell.getElementsByTagName("a")[0];
    if (!playerLink) {
        // This should mean that the slot is currently empty.
        return null;
    }
    const name = playerLink.textContent;
    const playerId = parsePlayerId(playerInfoCell) || name;
    const positions = parsePositions(playerInfoCell);
    const health = parseHealth(playerInfoCell);
    const opponent = parseOpponent(row);
    const isInjuredReserve = parseInjuredReserve(row);
    return new Player(playerId, name, positions, health, opponent, isInjuredReserve);
}

function getRosterState() {
    const { starterRows, benchRows } = getRosterRows();
    const slots = [];
    const players = [];
    const starterMapping = new Map();
    let slotId = 0;
    for (const row of starterRows) {
        const slot = createActivePlayerSlot(row, slotId++);
        slots.push(slot);
        const player = createPlayer(row);
        if (player !== null) {
            players.push(player);
        }
        starterMapping.set(slot.slotId, player);
    }
    const benchMapping = new Map();
    const injuredReserves = [];
    let benchSlotId = 0;
    for (const row of benchRows) {
        const player = createPlayer(row);
        if (player !== null) {
            players.push(player);
        }
        if (player !== null && player.isInjuredReserve) {
            injuredReserves.push(player);
        } else {
            benchMapping.set(benchSlotId++, player);
        }
    }
    return new RosterState(slots, players, starterMapping, benchMapping, injuredReserves);
}

function getActionButton(row) {
    return row.querySelector(".move-action-btn") || null;
}

function getMoveButton(player) {
    const rosterState = getRosterState();
    const playerSlot = rosterState.getCurrentPlayerSlot(player);
    const { starterRows, benchRows } = getRosterRows();
    const rows = playerSlot.starter ? starterRows : benchRows;
    return getActionButton(rows[playerSlot.idx]);
}

function getLockedButton(player) {
    return document.getElementById(`pncButtonLocked_${player.playerId}`);
}

function getHereButton(slotId) {
    return getActionButton(getRosterRows().starterRows[slotId]);
}

function performMove(currentRosterState, newMapping, saveDelay, whenFinished) {
    if (newMapping.length === 0) {
        whenFinished();
        return;
    }
    const [[slotId, player], ...remainingMapping] = newMapping;
    const currentPlayer = currentRosterState.starterMapping.get(slotId);
    const delay = saveDelay || DEFAULT_OPERATION_TIMEOUT_MS;
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
                // We need to "roll back" the move by clicking the Move button again.
                moveButton.click();
            } else {
                hereButton.click();
            }
            setTimeout(() => performMove(currentRosterState, remainingMapping, delay, whenFinished), delay);
        }, delay);
    } else {
        performMove(currentRosterState, remainingMapping, delay, whenFinished);
    }
}

function performMoves(currentRosterState, newRosterState, saveDelay) {
    const whenFinished = () => {};
    performMove(currentRosterState, Array.from(newRosterState.starterMapping), saveDelay, whenFinished);
}

function createAutoSetupButton() {
    const autoSetupButton = document.createElement("a");
    autoSetupButton.className = "AnchorLink Button Button--anchorLink Button--alt Button--custom ml4 action-buttons";
    autoSetupButton.onclick = performAutoSetup;
    const innerSpan = document.createElement("span");
    innerSpan.textContent = "Auto";
    autoSetupButton.appendChild(innerSpan);
    return autoSetupButton;
}

function fixTransactionCounterTooltip() {
    const tooltip = document.querySelector('.team-acquisitions-counter .counter-tooltip .tooltip-text');
    if (tooltip) {
        tooltip.innerText = 'Transactions';
    }
}

function addAutoSetupButton(myTeamButtonsDiv) {
    myTeamButtonsDiv.appendChild(createAutoSetupButton());
    fixTransactionCounterTooltip();
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

const currentSettings = {
    saveDelay: DEFAULT_OPERATION_TIMEOUT_MS
};

function updateSettings(settings) {
    console.debug("Updating extension settings", settings);
    currentSettings.saveDelay = settings.saveDelay;
}

function performAutoSetup() {
    console.debug("Performing auto-setup with current settings", currentSettings);
    const rosterState = getRosterState();
    const newRosterState = calculateNewRoster(rosterState);
    if (rosterState.isEquivalentTo(newRosterState)) {
        console.debug("No moves are necessary");
    } else {
        console.debug("Current active players", rosterState.starterMapping);
        console.debug("Suggested new active players", newRosterState.starterMapping);
        performMoves(rosterState, newRosterState, currentSettings.saveDelay);
    }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.debug("Received message", message);
    if (message.commandId === "perform-auto-setup") {
        performAutoSetup(currentSettings.saveDelay);
    } else if (message.commandId === "settings-changed") {
        updateSettings(message.settings);
    }
});

chrome.storage.sync.get(currentSettings, function(settings) {
    console.debug("Loading extension settings");
    for (const key in settings) {
        console.debug(key + " = " + settings[key]);
        currentSettings[key] = settings[key];
    }
})