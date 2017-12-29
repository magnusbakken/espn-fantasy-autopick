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
    constructor(playerId, name, positions, health) {
        this.playerId = playerId;
        this.name = name;
        this.positions = positions;
        this.health = health;
    }
}

class RosterState {
    constructor(slots, players, current_mapping) {
        this.slots = slots;
        this.players = players;
        this.current_mapping = current_mapping;
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
    return new Player(playerId, name, positions, health);
}

function getRosterState() {
    const table = document.getElementById("playertable_0");
    const { starterRows, benchRows } = getRosterRows(table);
    const slots = [];
    const players = [];
    let slotId = 1;
    for (const row of starterRows) {
        slots.push(createActivePlayerSlot(row, slotId++));
        const player = createPlayer(row);
        if (player !== null) {
            players.push(player);
        }
    }
    for (const row of benchRows) {
        const player = createPlayer(row);
        if (player !== null) {
            players.push(player);
        }
    }
    console.log(starterRows);
    console.log(benchRows);
    console.log(slots);
    console.log(players);
    return undefined;
}

function addResetButton() {
    const resetButton = document.getElementById("pncTopResetButton");
    const autoSetupButton = document.createElement("div");
    autoSetupButton.className = "pncTopButton pncTopButtonText";
    autoSetupButton.style = "margin-left: 6px";
    autoSetupButton.textContent = "Auto";
    autoSetupButton.onclick = function() {
        const rosterState = getRosterState();
    }
    resetButton.parentNode.insertBefore(autoSetupButton, resetButton);
}

addResetButton();