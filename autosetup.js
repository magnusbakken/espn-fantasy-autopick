SLOT_TYPE_POINT_GUARD = "PG";
SLOT_TYPE_SHOOTING_GUARD = "SG";
SLOT_TYPE_SMALL_FORWARD = "SF";
SLOT_TYPE_POWER_FORWARD = "PF";
SLOT_TYPE_CENTER = "C";
SLOT_TYPE_GUARD = "G";
SLOT_TYPE_FORWARD = "F";
SLOT_TYPE_UTIL = "UTIL";

SPECIFIC_SLOT_TYPES = [SLOT_TYPE_POINT_GUARD, SLOT_TYPE_SHOOTING_GUARD, SLOT_TYPE_SMALL_FORWARD, SLOT_TYPE_POWER_FORWARD, SLOT_TYPE_CENTER];
GENERIC_SLOT_TYPES = [SLOT_TYPE_GUARD, SLOT_TYPE_FORWARD, SLOT_TYPE_UTIL];

class ActivePlayerSlot {
    constructor(slotId, slotType) {
        this.slotId = slotId;
        this.slotType = slotType;
    }
}

PLAYER_HEALTH_HEALTHY = "HEALTHY";
PLAYER_HEALTH_DAYTODAY = "DTD";
PLAYER_HEALTH_OUT = "O";
PLAYER_HEALTH_SUSPENDED = "SSPD";

PLAYER_HEALTH_LEVELS = [PLAYER_HEALTH_HEALTHY, PLAYER_HEALTH_DAYTODAY, PLAYER_HEALTH_OUT, PLAYER_HEALTH_SUSPENDED];

class Player {
    constructor(playerId, name, positions, health, opponent) {
        this.playerId = playerId;
        this.name = name;
        this.positions = positions;
        this.health = health;
        this.opponent = opponent;
    }

    get isPlaying() {
        return this.opponent !== null;
    }

    compareHealth(otherPlayer) {
        return PLAYER_HEALTH_LEVELS.indexOf(this.health) >= PLAYER_HEALTH_LEVELS.indexOf(otherPlayer.health);
    }
}

class RosterState {
    constructor(slots, players, mapping) {
        this.slots = slots;
        this.players = players;
        this.mapping = mapping;
    }

    get hasRoomForEveryone() {
        return this.players.filter(p => p.isPlaying).length <= this.slots.length;
    }

    getSlotById(slotId) {
        return this.slots.find(s => s.slotId === slotId) || null;
    }

    getPlayerById(playerId) {
        return this.players.find(p => p.playerId === playerId) || null;
    }

    currentPlayer(slot) {
        return this.mapping.get(slot.slotId);
    }

    currentSlot(player) {
        const slotIds = Array.from(this.mapping.entries())
            .filter(([slotId, p]) => p !== null && player.playerId === p.playerId)
            .map(([slotId, p]) => slotId);
        return this.getSlotById(slotIds[0]);
    }

    assignPlayer(player, slot) {
        this.mapping.set(slot.slotId, player);
    }

    isEquivalentTo(otherRosterState) {
        for (const [key, value] of this.mapping.entries()) {
            if (value !== otherRosterState.mapping.get(key)) {
                return false;
            }
        }
        return true;
    }
}

function getRosterRows(table) {
    const starterRows = [];
    const benchRows = [];
    let isBench = false;
    for (const row of table.rows) {
        if (row.classList.contains("tableHead") && row.childNodes[0].textContent === "BENCH") {
            isBench = true;
        } else if (row.classList.contains("pncPlayerRow")) {
            if (isBench) {
                benchRows.push(row);
            } else {
                starterRows.push(row);
            }
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
        default: throw new Error("Unknown slot type: " + text);
    }
}

function createActivePlayerSlot(row, slotId) {
    const slotCell = row.getElementsByClassName("playerSlot")[0];
    const slotType = parseSlotType(slotCell.textContent);
    return new ActivePlayerSlot(slotId, slotType);
}

function parsePositions(playerInfoCell) {
    const text = playerInfoCell.childNodes[1].textContent;
    const match = /,\s*\w+\s+([\w,\s]+)/.exec(text)[1];
    return match.split(", ").map(s => s.trim());
}

function parseHealth(playerInfoCell) {
    const healthSpan = playerInfoCell.getElementsByTagName("span")[0];
    const healthString = healthSpan ? healthSpan.textContent : "";
    switch (healthString) {
        case "DTD": return PLAYER_HEALTH_DAYTODAY;
        case "O": return PLAYER_HEALTH_OUT;
        case "SSPD": return PLAYER_HEALTH_SUSPENDED;
        default: return PLAYER_HEALTH_HEALTHY;
    }
}

function parseOpponent(row) {
    const matchupCell = row.getElementsByTagName("td")[4];
    const matchupDiv = matchupCell.getElementsByTagName("div")[0];
    if (!matchupDiv) {
        return null;
    }
    const opponentTeamLink = matchupDiv.getElementsByTagName("a")[0];
    return opponentTeamLink.textContent;
}

function createPlayer(row) {
    const playerInfoCell = row.getElementsByClassName("playertablePlayerName")[0];
    if (!playerInfoCell) {
        return null;
    }
    const playerLink = playerInfoCell.getElementsByTagName("a")[0];
    const playerId = playerLink.getAttribute("playerid");
    const name = playerLink.textContent;
    const positions = parsePositions(playerInfoCell);
    const health = parseHealth(playerInfoCell);
    const opponent = parseOpponent(row);
    return new Player(playerId, name, positions, health, opponent);
}

function getRosterState() {
    const table = document.getElementById("playertable_0");
    const { starterRows, benchRows } = getRosterRows(table);
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

function positionMatchesSlot(position, slot) {
    const slotType = slot.slotType;
    if (slotType === "UTIL") {
        return true;
    }
    switch (position) {
        case "PG": return slotType === "PG" || slotType === "G";
        case "SG": return slotType === "SG" || slotType === "G";
        case "SF": return slotType === "SF" || slotType === "F";
        case "PF": return slotType === "PF" || slotType === "F";
        case "C": return slotType === "C";
        default: throw new Error("Unknown position type: ", position);
    }
}

function playerMatchesSlot(player, slot) {
    return player.positions.some(position => positionMatchesSlot(position, slot));
}

function getHealthiestPlayers(players) {
    for (const healthLevel of PLAYER_HEALTH_LEVELS) {
        const playersAtLevel = players.filter(p => p.health === healthLevel);
        if (playersAtLevel.length > 0) {
            return playersAtLevel;
        }
    }
    return [];
}

function findBestPlayerForSlot(rosterState, slot, availablePlayers) {
    const possiblePlayers = availablePlayers.filter(p => playerMatchesSlot(p, slot));
    if (possiblePlayers.length === 0) {
        console.debug("No possible player found for slot", slot);
        return null;
    } else if (possiblePlayers.length === 1) {
        const onlyPlayer = possiblePlayers[0];
        console.debug("Single eligible player found for slot", slot, onlyPlayer);
        return onlyPlayer;
    }
    // We can keep an injured player in their current slot if there are enough slots for all players with games.
    // If there aren't enough spots the current player must be moved.
    const healthiestPlayers = getHealthiestPlayers(possiblePlayers);
    const currentPlayer = rosterState.currentPlayer(slot);
    const currentPlayerIsPlaying = currentPlayer !== null && possiblePlayers.map(p => p.playerId).includes(currentPlayer.playerId);
    const currentPlayerIsHealthy = currentPlayer !== null && healthiestPlayers.map(p => p.playerId).includes(currentPlayer.playerId);
    if (currentPlayerIsPlaying && (rosterState.hasRoomForEveryone || currentPlayerIsHealthy)) {
        console.debug("Keeping current player for slot", slot, currentPlayer);
        return currentPlayer;
    }
    // Don't choose a player who's already in a different slot of the same type. The ESPN page doesn't allow you to move a player from a slot
    // to another slot with the same type. In practice this only applies to moving from one UTIL slot to a different one.
    const playersWithCurrentSlots = possiblePlayers.map(p => [p, rosterState.currentSlot(p)]);
    playersWithCurrentSlots.sort(([p1, slot1], [p2, slot2]) => p1.compareHealth(p2));
    while (playersWithCurrentSlots.length > 0) {
        const [player, currentSlot] = playersWithCurrentSlots[0];
        if (currentSlot === null || currentSlot.slotType !== slot.slotType) {
            console.debug("Choosing first available player", slot, player);
            return player;
        }
        playersWithCurrentSlots.splice(0, 1);
    }
    console.debug("All available players are already occupying same slot type", slot);
    return null;
}

function calculateNewRoster(rosterState) {
    const newRosterState = new RosterState(rosterState.slots, rosterState.players, new Map(rosterState.mapping));
    const availablePlayers = rosterState.players.filter(p => p.isPlaying);
    for (const slot of rosterState.slots) {
        let chosenPlayer = findBestPlayerForSlot(rosterState, slot, availablePlayers);
        if (chosenPlayer === null) {
            // No active player can fill the slot. Keep the current inactive player in the slot if possible.
            const currentPlayer = rosterState.currentPlayer(slot);
            if (currentPlayer !== null && availablePlayers.includes(currentPlayer)) {
                chosenPlayer = currentPlayer;
            }
        } else {
            availablePlayers.splice(availablePlayers.indexOf(chosenPlayer), 1);
        }
        newRosterState.assignPlayer(chosenPlayer, slot);
    }
    return newRosterState;
}

function getMoveButton(player) {
    return document.getElementById(`pncButtonMove_${player.playerId}`);
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

function performMove(currentRosterState, newMapping) {
    if (newMapping.length === 0) {
        return;
    }
    const [[slotId, player], ...remainingMapping] = newMapping;
    const currentPlayer = currentRosterState.mapping.get(slotId);
    if (player !== null && (currentPlayer === null || currentPlayer.playerId !== player.playerId)) {
        console.debug("Moving player to slot", player, slotId);
        // Wait for a short while between sending clicks to the Move button and to the Here button.
        // Without this we get intermittent errors from the click handlers on the ESPN page.
        getMoveButton(player).click();
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
            setTimeout(() => performMove(currentRosterState, remainingMapping), 10);
        }, 10);
    } else {
        performMove(currentRosterState, remainingMapping);
    }
}

function performMoves(currentRosterState, newRosterState) {
    performMove(currentRosterState, Array.from(newRosterState.mapping));
}

function createAutoSetupButton() {
    const autoSetupButton = document.createElement("div");
    autoSetupButton.id = "pncTopAutoButton";
    autoSetupButton.className = "pncTopButton pncTopButtonText";
    autoSetupButton.style = "margin-left: 6px";
    autoSetupButton.textContent = "Auto";
    autoSetupButton.onclick = performAutoSetup;
    return autoSetupButton;
}

function addAutoSetupButton() {
    const resetButton = document.getElementById("pncTopResetButton");
    if (!resetButton) {
        return;
    }
    const autoSetupButton = createAutoSetupButton();
    resetButton.parentNode.insertBefore(autoSetupButton, resetButton);
    const submitCell = document.getElementsByClassName("playerTableSubmitCell")[0];
    submitCell.style.width = `${submitCell.clientWidth + autoSetupButton.clientWidth + 6}px`;
}

addAutoSetupButton();

const containerDiv = document.getElementById("playerTableContainerDiv");
const observer = new MutationObserver(mutations => {
    const mutation = mutations.filter(m => m.target === containerDiv)[0];
    if (mutation && Array.from(mutation.addedNodes).some(n => n.id === "playerTableFramedForm")) {
        addAutoSetupButton();
    }
});
observer.observe(containerDiv, { childList: true, subtree: true });

function performAutoSetup() {
    const rosterState = getRosterState();
    const newRosterState = calculateNewRoster(rosterState);
    if (rosterState.isEquivalentTo(newRosterState)) {
        console.debug("No moves are necessary");
    } else {
        console.debug("Current active players", rosterState.mapping);
        console.debug("Suggested new active players", newRosterState.mapping);
        performMoves(rosterState, newRosterState);
    }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message === "perform-auto-setup") {
        performAutoSetup();
    }
});