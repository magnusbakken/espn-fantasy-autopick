DEFAULT_OPERATION_TIMEOUT_MS = 1000;
DEFAULT_LOAD_TIMEOUT_MS = 1000;
DEFAULT_LOAD_ATTEMPT_LIMIT = 10;
DEFAULT_CUSTOM_DAYS = 10;

const currentSettings = {
    saveDelay: DEFAULT_OPERATION_TIMEOUT_MS,
    loadDelay: DEFAULT_LOAD_TIMEOUT_MS,
    loadMaxAttempts: DEFAULT_LOAD_ATTEMPT_LIMIT,
    customDaysDefault: DEFAULT_CUSTOM_DAYS,
};

function getCurrentWeekDiv() {
    return document.querySelector('div.currentWeek > div.Week__wrapper');
}

function currentDayIndex(weekDiv) {
    const allDays = Array.from(weekDiv.getElementsByTagName('div'));
    return allDays.findIndex(day => Array.from(day.classList).includes('is-current'));
}

function dayByIndex(weekDiv, idx) {
    return Array.from(weekDiv.getElementsByTagName('div'))[idx];
}

function dateForDayDiv(dayDiv) {
    const dateSpan = dayDiv.querySelector('span.day--date');
    if (!dateSpan) {
        return null;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = today.getFullYear();
    const dateIfCurrentYear = new Date(`${dateSpan.innerText} ${currentYear}`);
    if (dateIfCurrentYear >= today) {
        return dateIfCurrentYear;
    } else {
        return new Date(`${dateSpan.innerText} ${currentYear + 1}`);
    }
}

function getCurrentDate() {
    const currentWeek = getCurrentWeekDiv();
    if (!currentWeek) {
        console.warn('Unable to find current week element on page');
        return null;
    }
    const idx = currentDayIndex(currentWeek);
    if (idx < 0) {
        console.warn('Unable to find current day element on page');
        return null;
    }
    const dayDiv = dayByIndex(currentWeek, idx);
    const date = dateForDayDiv(dayDiv);
    if (!date) {
        console.warn('Unable to find calendar date of current day', currentWeek, idx);
        return null;
    }
    return date;
}

function getLastDateOfCurrentWeek() {
    // ESPN game weeks are always considered to end on Sundays.
    // If the current day is a Sunday (for which getDay returns 0) we shouldn't keep going to the next week.
    // This is why we only increase the date value when getDay returns 1-6.
    const date = getCurrentDate();
    const remainingDays = 7 - date.getDay();
    if (remainingDays < 7) {
        date.setDate(date.getDate() + remainingDays);
    }
    return date;
}

function getLastDateForDayCount(days) {
    const date = getCurrentDate();
    date.setDate(date.getDate() + days);
    return date;
}

function goToNextWeek(action) {
    const nextWeekButton = document.querySelector('button.Arrow--right');
    if (!nextWeekButton) {
        console.warn('Unable to find next week button on page');
        return;
    }
    // This operation should be fast. All the weeks are already loaded into the DOM. Only the roster data is loaded from the server.
    nextWeekButton.click();
    setTimeout(action, 100);
}

function waitForRoster(expectedDate, loadDelay, loadMaxAttempts, action) {
    // We expect to see a date on the form "December 30" in the refreshed page.
    // The text appears in all caps, but that's because of a CSS rule, so we don't need to convert to uppercase.
    console.debug('Checking if the roster has been loaded for the expected date', expectedDate);
    const expectedMonthString = expectedDate.toLocaleString('en', { month: 'long' });
    const expectedDateString = `${expectedMonthString} ${expectedDate.getDate()}`;
    const retry = numAttempts => {
        const selector = `th[title='${expectedDateString}']`;
        const expectedHeader = document.querySelector(selector);
        if (!expectedHeader) {
            console.warn(`Expected date header not found in roster table after ${numAttempts + 1} attempts`);
            if (numAttempts + 1 < loadMaxAttempts) {
                setTimeout(() => retry(numAttempts + 1), loadDelay);
            } else {
                console.warn(`Giving up. The selector that failed was "${selector}"`);
            }
        } else {
            setTimeout(action, loadDelay);
        }
    };
    retry(0);
}

function goToDay(idx, loadDelay, loadMaxAttempts, action) {
    const currentWeek = getCurrentWeekDiv();
    const dayDiv = dayByIndex(currentWeek, idx);
    const expectedDate = dateForDayDiv(dayDiv);
    if (!expectedDate) {
        console.warn('Unable to find calendar date of next day', currentWeek, idx);
        return;
    }
    dayDiv.click();
    waitForRoster(expectedDate, loadDelay, loadMaxAttempts, action);
}

function goToNextDay(loadDelay, loadMaxAttempts, action) {
    const currentWeek = getCurrentWeekDiv();
    if (!currentWeek) {
        console.warn('Unable to find current week element on page');
        return;
    }
    const idx = currentDayIndex(currentWeek);
    if (idx < 0) {
        console.warn('Unable to find current day element on page');
        return;
    }
    if (idx === 4) { // There are always 5 days per "week".
        goToNextWeek(() => goToDay(0, loadDelay, loadMaxAttempts, action));
    } else {
        goToDay(idx+1, loadDelay, loadMaxAttempts, action);
    }
}

function getRosterRows() {
    const tableBody = document.querySelector('.players-table tbody.Table__TBODY');
    const starterRows = [];
    const benchRows = [];
    for (const row of tableBody.getElementsByTagName('tr')) {
        const slotCell = row.getElementsByTagName('td')[0];
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
        case 'F': return SLOT_TYPE_FORWARD;
        case 'D': return SLOT_TYPE_DEFENSEMEN;
        case 'G': return SLOT_TYPE_GOALIE;
        case 'UTIL': return SLOT_TYPE_UTIL;
        case 'Bench': return SLOT_TYPE_BENCH;
        case 'IR': return SLOT_TYPE_IR;
        default: throw new Error('Unknown slot type: ' + text);
    }
}

function createActivePlayerSlot(row, slotId) {
    const slotCell = row.getElementsByTagName('td')[0];
    const slotType = parseSlotType(slotCell.textContent);
    return new ActivePlayerSlot(slotId, slotType);
}

function parsePlayerId(playerInfoCell) {
    // The only place we can reliably find the player ID is in the image.
    // For players that don't have headshots (typically rookies) there's no way to get the ID here.
    const image = playerInfoCell.getElementsByTagName('img')[0];
    const match = /.*\/(\d+)\.png.*/.exec(image.src);
    return match ? Number.parseInt(match[1]) : null;
}

function parsePositions(playerInfoCell) {
    const span = playerInfoCell.getElementsByClassName('playerinfo__playerpos')[0];
    return span.textContent.split(', ').map(s => s.trim());
}

function parseHealth(playerInfoCell) {
    const healthSpan = playerInfoCell.getElementsByClassName('playerinfo__injurystatus')[0];
    const healthString = healthSpan ? healthSpan.textContent : '';
    switch (healthString) {
        case 'DTD': return PLAYER_HEALTH_DAYTODAY;
        case 'O': return PLAYER_HEALTH_OUT;
        case 'SSPD': return PLAYER_HEALTH_SUSPENDED;
        default: return PLAYER_HEALTH_HEALTHY;
    }
}

function parseOpponent(row) {
    const matchupCell = row.getElementsByTagName('td')[3];
    const matchupDiv = matchupCell.getElementsByTagName('div')[0];
    if (!matchupDiv) {
        return null;
    }
    const opponentTeamLink = matchupDiv.getElementsByTagName('a')[0];
    return opponentTeamLink ? opponentTeamLink.textContent : null;
}

function parseInjuredReserve(row) {
    const positionCell = row.getElementsByTagName('td')[0];
    const positionDiv = positionCell.getElementsByTagName('div')[0];
    return positionDiv && positionDiv.textContent === 'IR';
}

function createPlayer(row) {
    const playerInfoCell = row.getElementsByTagName('td')[1];
    const playerLink = playerInfoCell.getElementsByTagName('a')[0];
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
    return row.querySelector('.move-action-btn') || null;
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

function performMove(currentRosterState, newMapping, saveDelay, action) {
    if (newMapping.length === 0) {
        if (action) {
            action();
        }
        return;
    }
    const delay = saveDelay || DEFAULT_OPERATION_TIMEOUT_MS;
    const [[slotId, player], ...remainingMapping] = newMapping;
    if (player === null) {
        performMove(currentRosterState, remainingMapping, delay, action);
        return;
    }
    const currentPlayer = currentRosterState.starterMapping.get(slotId);
    if (currentPlayer === null || currentPlayer.playerId !== player.playerId) {
        console.debug('Moving player to slot', player, slotId);
        // Wait for a short while between sending clicks to the Move button and to the Here button.
        // Without this we get intermittent errors from the click handlers on the ESPN page.
        const moveButton = getMoveButton(player);
        if (moveButton === null) {
            const lockedButton = getLockedButton(player);
            if (lockedButton === null) {
                console.warn('No Move button found, and we don\'t know why.');
            } else {
                console.debug('Unable to perform move because the player\'s slot is locked. This is probably because the player\'s game has already started, or is about to start.');
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
                // We need to 'roll back' the move by clicking the Move button again.
                moveButton.click();
            } else {
                hereButton.click();
            }
            setTimeout(() => performMove(currentRosterState, remainingMapping, delay, action), delay);
        }, delay);
    } else {
        if (currentPlayer !== null && currentPlayer.playerId === player.playerId) {
            console.debug('Not moving player because they\'re already in the destination slot', player, slotId);
        }
        performMove(currentRosterState, remainingMapping, delay, action);
    }
}

function performMoves(currentRosterState, newRosterState, saveDelay, action) {
    performMove(currentRosterState, Array.from(newRosterState.starterMapping), saveDelay, action);
}

function createButton(label, tooltip, onclick) {
    const autoSetupButton = document.createElement('a');
    autoSetupButton.className = 'AnchorLink Button Button--anchorLink Button--alt Button--custom ml4 action-buttons';
    autoSetupButton.style = 'min-width: auto';
    autoSetupButton.title = tooltip;
    autoSetupButton.onclick = onclick;
    const innerSpan = document.createElement('span');
    innerSpan.textContent = label;
    autoSetupButton.appendChild(innerSpan);
    return autoSetupButton;
}

function createAutoSetupButton() {
    return createButton('Auto (day)', 'Automatically set up the team for the current day', () => performAutoSetup());
}

function createAutoSetupWeekButton() {
    return createButton('Auto (week)', 'Automatically set up the team for the remainder of the current week (Monday-Sunday)', () => performCurrentWeekSetup());
}

function fixTransactionCounterTooltip() {
    const tooltip = document.querySelector('.team-acquisitions-counter .counter-tooltip .tooltip-text');
    if (tooltip) {
        tooltip.innerText = '';
    }
}

function fixSetLineupLabel() {
    const label = document.querySelector('.scoring--period-label');
    if (label) {
        label.innerText = '🏀';
    }
}

function addAutoSetupButton(myTeamButtonsDiv) {
    myTeamButtonsDiv.appendChild(createAutoSetupWeekButton());
    myTeamButtonsDiv.appendChild(createAutoSetupButton());
    fixTransactionCounterTooltip();
    fixSetLineupLabel();
}

function updateSettings(settings) {
    console.debug('Updating extension settings', settings);
    currentSettings.saveDelay = settings.saveDelay;
}

function performAutoSetup(action, isRetry) {
    console.debug('Performing auto-setup with current settings', currentSettings, isRetry);
    const rosterState = getRosterState();
    const newRosterState = calculateNewRoster(rosterState);
    if (rosterState.isEquivalentTo(newRosterState)) {
        console.debug('No moves are necessary');
        if (action) {
            action();
        }
    } else {
        console.debug('Current active players', rosterState.starterMapping);
        console.debug('Suggested new active players', newRosterState.starterMapping);
        const retryIfIncomplete = () => {
            // Sometimes a move may have failed to execute as expected, and we're left with a bad roster state.
            // One known cause of this is that the ESPN page shuffles around the UTIL slots in some cases,
            // potentially causing incorrect moves: https://github.com/magnusbakken/espn-fantasy-autopick/issues/7
            // If we detect retry once we should get the right result in 99% of cases.
            // We only retry once, so we can't stuck in an infinite retry loop.
            const finishedRosterState = getRosterState();
            if (!isRetry && !finishedRosterState.isEquivalentTo(newRosterState)) {
                console.debug('Failed to execute all the expected moves. Retrying once', newRosterState, finishedRosterState);
                performAutoSetup(action, true);
            } else if (action) {
                action();
            }
        };
        performMoves(rosterState, newRosterState, currentSettings.saveDelay, retryIfIncomplete);
    }
}

function getStopDate(stopValue) {
    if (stopValue === 'current-week') {
        return getLastDateOfCurrentWeek();
    } else if (typeof stopValue === 'number') {
        return getLastDateForDayCount(stopValue);
    }
}

function performMultiDaySetup(stopValue) {
    // We make sure the date is at the very beginning of the day so we don't accidentally keep going because of clock discrepancies.
    const stopDate = getStopDate(stopValue);
    if (!stopDate) {
        console.warn('We were unable to find the date of the last day on which to perform setup with the stop value', stopValue);
        return;
    }
    stopDate.setHours(0);
    stopDate.setMinutes(0);
    stopDate.setSeconds(0);
    console.debug('Performing muiti-day setup ending on', stopDate);
    const loadDelay = currentSettings.loadDelay;
    const loadMaxAttempts = currentSettings.loadMaxAttempts;
    performAutoSetup(() => {
        let count = 0;
        const go = () => {
            count++;
            const currentDate = getCurrentDate();
            if (currentDate < stopDate) {
                goToNextDay(loadDelay, loadMaxAttempts, () => performAutoSetup(go));
            } else {
                console.debug(`Finished automatic setup after setting up ${count} days`);
            }
        };
        go();
    });
}

function performCurrentWeekSetup() {
    performMultiDaySetup('current-week');
}

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        const contentNavDiv = Array.from(mutation.addedNodes).filter(n => n.classList && n.classList.contains('content-nav'))[0];
        if (!contentNavDiv) {
            continue;
        }
        const myTeamButtonsDiv = contentNavDiv.getElementsByClassName('myTeamButtons')[0];
        if (!myTeamButtonsDiv) {
            console.warn('Unable to find expected div with class name "myTeamButtons"');
            break;
        }
        addAutoSetupButton(myTeamButtonsDiv);
    }
});
observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener(function(message) {
    console.debug('Received message', message);
    if (message.commandId === 'perform-auto-setup') {
        performAutoSetup(currentSettings.saveDelay);
    } else if (message.commandId === 'perform-current-week-setup') {
        performMultiDaySetup('current-week');
    } else if (message.commandId === 'perform-multi-setup') {
        performMultiDaySetup(parseInt(message.message.days));
    } else if (message.commandId === 'settings-changed') {
        updateSettings(message.settings);
    }
});

chrome.storage.sync.get(currentSettings, function(settings) {
    console.debug('Loading extension settings');
    for (const key in settings) {
        console.debug(key + ' = ' + settings[key]);
        currentSettings[key] = settings[key];
    }
})