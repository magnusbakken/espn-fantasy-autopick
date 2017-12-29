SLOT_TYPE_POINT_GUARD = "PG"
SLOT_TYPE_SHOOTING_GUARD = "SG"
SLOT_TYPE_SMALL_FORWARD = "SF"
SLOT_TYPE_POWER_FORWARD = "PF"
SLOT_TYPE_CENTER = "C"
SLOT_TYPE_GUARD = "G"
SLOT_TYPE_FORWARD = "F"
SLOT_TYPE_UTIL = "UTIL"

SPECIFIC_SLOT_TYPES = [SLOT_TYPE_POINT_GUARD, SLOT_TYPE_SHOOTING_GUARD, SLOT_TYPE_SMALL_FORWARD, SLOT_TYPE_POWER_FORWARD, SLOT_TYPE_CENTER]
GENERIC_SLOT_TYPES = [SLOT_TYPE_GUARD, SLOT_TYPE_FORWARD, SLOT_TYPE_UTIL]

class ActivePlayerSlot {
    constructor(slotId, slotType) {
        this.slotId = slotId;
        this.slotType = slotType;
    }
}

PLAYER_HEALTH_HEALTHY = "HEALTHY"
PLAYER_HEALTH_DAYTODAY = "DTD"
PLAYER_HEALTH_OUT = "O"

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
}

class RosterState {
    constructor(slots, players, mapping) {
        this.slots = slots;
        this.players = players;
        this.mapping = mapping;
    }

    getSlotById(slotId) {
        return this.slots.find(s => s.slotId === slotId);
    }

    getPlayerById(playerId) {
        return this.players.find(p => p.playerId === playerId);
    }

    isPlayerActive(player) {
        return Array.from(this.mapping.values())
            .filter(p => p !== null)
            .map(p => p.playerId)
            .includes(player.playerId);
    }

    currentSlot(player) {
        const slotId = Array.from(this.mapping.entries())
            .filter(([slotId, p]) => p !== null && player.playerId === p.playerId)
            .map(([slotId, p]) => slotId);
        return this.getSlotById(slotId);
    }

    assignPlayer(player, slot) {
        this.mapping.set(slot.slotId, player);
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

function isRosterPerfect(rosterState) {
    const playersInAction = Array.from(rosterState.mapping.values()).filter(p => p !== null && p.isPlaying);
    const potentialPlayers = rosterState.players.filter(p => p.isPlaying);
    return playersInAction.length === potentialPlayers.length;
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

function slotIsAvailable(rosterState, slot) {
    const currentPlayer = rosterState.mapping.get(slot.slotId);
    return currentPlayer === null || !currentPlayer.isPlaying;
}

function getFirstPossibleSlot(rosterState, player) {
    const availableSlots = rosterState.slots
        .filter(slot => playerMatchesSlot(player, slot) && slotIsAvailable(rosterState, slot));
    return availableSlots ? availableSlots[0] : null;
}

function calculateTrivialMoves(rosterState) {
    const missingPlayers = rosterState.players.filter(p => !rosterState.isPlayerActive(p) && p.isPlaying);
    for (const player of missingPlayers) {
        const firstPossibleSlot = getFirstPossibleSlot(rosterState, player);
        if (firstPossibleSlot === null) {
            console.log("No possible slot found for player", player);
        } else {
            rosterState.assignPlayer(player, firstPossibleSlot);
        }
    }
}

function findMoreSpecificSlot(rosterState, player, currentSlot) {
    if (!GENERIC_SLOT_TYPES.includes(currentSlot.slotType)) {
        return currentSlot;
    }
    const candidateSlots = rosterState.slots
        .filter(s => SPECIFIC_SLOT_TYPES.includes(s.slotType))
        .filter(s => slotIsAvailable(rosterState, s))
        .filter(s => playerMatchesSlot(player, s))
    return candidateSlots ? candidateSlots[0] : currentSlot;
}

function preferSpecificSlots(rosterState) {
    const activePlayers = rosterState.players.filter(p => rosterState.isPlayerActive(p));
    for (const player of activePlayers) {
        const currentSlot = rosterState.currentSlot(player);
        const newSlot = findMoreSpecificSlot(rosterState, player, currentSlot);
        rosterState.assignPlayer(player, newSlot);
    }
}

function determineLineup(rosterState) {
    if (isRosterPerfect(rosterState)) {
        return rosterState;
    }
    const newRosterState = new RosterState(rosterState.slots, rosterState.players, new Map(rosterState.mapping));
    calculateTrivialMoves(newRosterState);
    if (!isRosterPerfect(newRosterState)) {
        preferSpecificSlots(newRosterState);
    }
    return newRosterState;
}

function getMoveButton(player) {
    return document.getElementById(`pncButtonMove_${player.playerId}`);
}

function getHereButton(slotId) {
    const slotRows = document.getElementsByClassName("pncPlayerRow");
    return slotRows[slotId].getElementsByClassName("pncButtonHere")[0];
}

function performMove(currentRosterState, newMapping) {
    const [[slotId, player], ...remainingMapping] = newMapping;
    const currentPlayer = currentRosterState.mapping.get(slotId);
    let movedPlayer = false;
    if (currentPlayer === null || currentPlayer.playerId !== player.playerId) {
        getMoveButton(player).click();
        getHereButton(slotId).click();
        movedPlayer = true;
    }
    if (remainingMapping.length > 0) {
        if (movedPlayer) {
            setTimeout(() => performMove(currentRosterState, remainingMapping), 0);
        } else {
            performMove(currentRosterState, remainingMapping);
        }
    }
}

function performMoves(currentRosterState, newRosterState) {
    const mapping = Array.from(newRosterState.mapping);
    performMove(currentRosterState, mapping);
}

function performAutoSetup() {
    const rosterState = getRosterState();
    console.debug("Current active players", rosterState.mapping);
    const newRosterState = determineLineup(rosterState);
    console.debug("Suggested new active players", newRosterState.mapping);
    performMoves(rosterState, newRosterState);
}

function addAutoSetupButton() {
    const resetButton = document.getElementById("pncTopResetButton");
    const autoSetupButton = document.createElement("div");
    autoSetupButton.id = "pncTopAutoButton";
    autoSetupButton.className = "pncTopButton pncTopButtonText";
    autoSetupButton.style = "margin-left: 6px";
    autoSetupButton.textContent = "Auto";
    autoSetupButton.onclick = performAutoSetup;
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
