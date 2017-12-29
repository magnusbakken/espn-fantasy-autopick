SLOT_TYPE_POINT_GUARD = "PG"
SLOT_TYPE_SHOOTING_GUARD = "SG"
SLOT_TYPE_SMALL_FORWARD = "SF"
SLOT_TYPE_POWER_FORWARD = "PF"
SLOT_TYPE_CENTER = "C"
SLOT_TYPE_GUARD = "G"
SLOT_TYPE_FORWARD = "F"
SLOT_TYPE_UTIL = "UTIL"

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
    constructor(slots, players, currentMapping) {
        this.slots = slots;
        this.players = players;
        this.currentMapping = currentMapping;
    }

    isActive(player) {
        return Array.from(this.currentMapping.values())
            .filter(p => p !== null)
            .map(p => p.playerId)
            .includes(player.playerId);
    }

    assignPlayer(player, slot) {
        this.currentMapping.set(slot.slotId, player);
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
    const playersInAction = Array.from(rosterState.currentMapping.values()).filter(p => p !== null && p.isPlaying);
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
    const currentPlayer = rosterState.currentMapping.get(slot.slotId);
    return currentPlayer === null || !currentPlayer.isPlaying;
}

function getFirstPossibleSlot(rosterState, player) {
    const availableSlots = rosterState.slots
        .filter(slot => playerMatchesSlot(player, slot) && slotIsAvailable(rosterState, slot));
    return availableSlots ? availableSlots[0] : null;
}

function calculateTrivialMoves(rosterState) {
    const missingPlayers = rosterState.players.filter(p => !rosterState.isActive(p) && p.isPlaying);
    for (const player of missingPlayers) {
        const firstPossibleSlot = getFirstPossibleSlot(rosterState, player);
        if (firstPossibleSlot === null) {
            console.log("No possible slot found for player", player);
        } else {
            rosterState.assignPlayer(player, firstPossibleSlot);
        }
    }
}

function determineLineup(rosterState) {
    if (isRosterPerfect(rosterState)) {
        return rosterState;
    }
    const newRosterState = new RosterState(rosterState.slots, rosterState.players, new Map(rosterState.currentMapping));
    calculateTrivialMoves(newRosterState);
    return newRosterState;
}

function performMoves(currentRosterState, newRosterState) {
    for (const [slotId, player] of newRosterState.currentMapping) {
        if (player === null) {
            continue;
        }
        const playerId = player.playerId;
        const currentPlayer = currentRosterState.currentMapping.get(slotId);
        if (currentPlayer === null || currentPlayer.playerId !== player.playerId) {
            const moveButton = document.getElementById(`pncButtonMove_${player.playerId}`);
            moveButton.click();
            const dropButton = document.getElementById(`pncButtonHere_${slotId}`);
            dropButton.click();
        }
    }
}

function performAutoSetup() {
    const rosterState = getRosterState();
    console.debug("Current roster state", rosterState);
    const newRosterState = determineLineup(rosterState);
    console.debug("Suggested new roster state", newRosterState);
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
