SLOT_TYPE_FORWARD = 'F';
SLOT_TYPE_DEFENSEMEN = 'D';
SLOT_TYPE_GOALIE = 'G';
SLOT_TYPE_UTIL = 'UTIL';
SLOT_TYPE_BENCH = 'Bench';
SLOT_TYPE_IR = 'IR';

POSITION_SLOT_MAPPING = {
    'F': [SLOT_TYPE_FORWARD, SLOT_TYPE_UTIL],
    'D': [SLOT_TYPE_DEFENSEMEN, SLOT_TYPE_UTIL],
    'G': [SLOT_TYPE_GOALIE],
}

class ActivePlayerSlot {
    constructor(slotId, slotType) {
        this.slotId = slotId;
        this.slotType = slotType;
    }
}

PLAYER_HEALTH_HEALTHY = 'HEALTHY';
PLAYER_HEALTH_DAYTODAY = 'DTD';
PLAYER_HEALTH_OUT = 'O';
PLAYER_HEALTH_SUSPENDED = 'SSPD';

PLAYER_HEALTH_LEVELS = [PLAYER_HEALTH_HEALTHY, PLAYER_HEALTH_DAYTODAY, PLAYER_HEALTH_OUT, PLAYER_HEALTH_SUSPENDED];

class Player {
    constructor(playerId, name, positions, health, opponent, isInjuredReserve) {
        this.playerId = playerId;
        this.name = name;
        this.positions = positions;
        this.health = health;
        this.opponent = opponent;
        this.isInjuredReserve = isInjuredReserve;
    }

    get isPlaying() {
        return this.opponent !== null;
    }

    compareHealth(otherPlayer) {
        return PLAYER_HEALTH_LEVELS.indexOf(this.health) - PLAYER_HEALTH_LEVELS.indexOf(otherPlayer.health);
    }

    isEqualTo(otherPlayer) {
        return otherPlayer === null || this.playerId === otherPlayer.playerId;
    }
}

class RosterState {
    constructor(slots, players, starterMapping, benchMapping, injuredReserves) {
        this.slots = slots;
        this.players = players;
        this.starterMapping = starterMapping;
        this.benchMapping = benchMapping;
        this.injuredReserves = injuredReserves;
    }

    get hasRoomForEveryone() {
        return this.players.filter(p => p.isPlaying || p.isInjuredReserve).length <= this.slots.length;
    }

    get isEveryonePlaying() {
        return Array.from(this.benchMapping.values()).every(p => !p || !p.isPlaying);
    }

    getCurrentPlayerSlot(player) {
        for (const [key, value] of this.starterMapping) {
            if (value && value.playerId === player.playerId) {
                return { starter: true, idx: key };
            }
        }
        for (const [key, value] of this.benchMapping) {
            if (value && value.playerId === player.playerId) {
                return { starter: false, idx: key };
            }
        }
        return null;
    }

    getSlotById(slotId) {
        return this.slots.find(s => s.slotId === slotId) || null;
    }

    getPlayerById(playerId) {
        return this.players.find(p => p.playerId === playerId) || null;
    }

    currentPlayer(slot) {
        return this.starterMapping.get(slot.slotId);
    }

    currentSlot(player) {
        const slotIds = Array.from(this.starterMapping.entries())
            .filter(([slotId, p]) => p !== null && player.playerId === p.playerId)
            .map(([slotId, p]) => slotId);
        return this.getSlotById(slotIds[0]);
    }

    assignPlayer(player, slot) {
        this.starterMapping.set(slot.slotId, player);
    }

    isEquivalentTo(otherRosterState) {
        for (const [key, player] of this.starterMapping.entries()) {
            const otherPlayer = otherRosterState.starterMapping.get(key);
            if ((player === null && otherPlayer !== null) || (player !== null && !player.isEqualTo(otherPlayer))) {
                return false;
            }
        }
        return true;
    }
}

function positionMatchesSlot(position, slot) {
    return POSITION_SLOT_MAPPING[position].includes(slot.slotType);
}

function playerMatchesSlot(player, slot) {
    return !player.isInjuredReserve && player.positions.some(position => positionMatchesSlot(position, slot));
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

function numberOfPossiblePlayers(slot, players) {
    return players.filter(p => playerMatchesSlot(p, slot)).length;
}

function findBestPlayerForSlot(rosterState, slot, availablePlayers) {
    const possiblePlayers = availablePlayers.filter(p => playerMatchesSlot(p, slot));
    if (possiblePlayers.length === 0) {
        console.debug('No possible player found for slot', slot);
        return null;
    } else if (possiblePlayers.length === 1) {
        const onlyPlayer = possiblePlayers[0];
        console.debug('Single eligible player found for slot', slot, onlyPlayer);
        return onlyPlayer;
    }
    // We can keep an injured player in their current slot if there are enough slots for all players with games.
    // If there aren't enough spots the current player must be moved.
    const healthiestPlayers = getHealthiestPlayers(possiblePlayers);
    const currentPlayer = rosterState.currentPlayer(slot);
    const currentPlayerIsPlaying = currentPlayer !== null && possiblePlayers.map(p => p.playerId).includes(currentPlayer.playerId);
    const currentPlayerIsHealthy = currentPlayer !== null && healthiestPlayers.map(p => p.playerId).includes(currentPlayer.playerId);
    if (currentPlayerIsPlaying && (rosterState.hasRoomForEveryone || currentPlayerIsHealthy)) { // TODO: may need to move the player even if healthy, if the player is the only one that fits another slot.
        console.debug('Keeping current player for slot', slot, currentPlayer);
        return currentPlayer;
    }
    // Don't choose a player who's already in a different slot of the same type. The ESPN page doesn't allow you to move a player from a slot
    // to another slot with the same type. In practice this only applies to moving from one UTIL slot to a different one.
    const playersWithCurrentSlots = possiblePlayers.map(p => [p, rosterState.currentSlot(p)]);
    playersWithCurrentSlots.sort(([p1, slot1], [p2, slot2]) => p1.compareHealth(p2));
    while (playersWithCurrentSlots.length > 0) {
        const [player, currentSlot] = playersWithCurrentSlots[0];
        if (currentSlot === null || currentSlot.slotType !== slot.slotType) {
            console.debug('Choosing first available player', slot, player);
            return player;
        }
        playersWithCurrentSlots.splice(0, 1);
    }
    console.debug('All available players are already occupying same slot type', slot);
    return null;
}

function slotsByPreference(rosterState, availablePlayers) {
    return rosterState.slots
        .map(slot => [slot, numberOfPossiblePlayers(slot, availablePlayers)])
        .sort(([slot1, amount1], [slot2, amount2]) => {
            // The sort order here gives preference to slots with fewer total available players.
            // For slots with the same number of available players, it prefers slots with lower IDs.
            // This avoids a rare issue with multiple UTIL slots that don't currently contain a player,
            // in which case the ESPN page will only allow you to add a player to the first empty UTIL slot.
            if (amount1 !== amount2) {
                return amount1 - amount2;
            } else {
                return slot1.id - slot2.id;
            }
        })
        .map(([slot, _]) => slot);
}

function calculateNewRoster(rosterState) {
    if (rosterState.isEveryonePlaying) {
        console.debug('Everybody is already playing');
        return rosterState;
    }
    const newRosterState = new RosterState(rosterState.slots, rosterState.players, new Map(rosterState.starterMapping), new Map(rosterState.benchMapping));
    const availablePlayers = rosterState.players.filter(p => p.isPlaying);
    for (const slot of slotsByPreference(rosterState, availablePlayers)) {
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