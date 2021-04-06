# ESPN Fantasy Autopick Chrome Extension
A pair of Chrome extensions that let you automatically add active players to the current roster in an ESPN NBA/NHL fantasy league.

# How to install
The extensions can be found in the Chrome Web Store:
- [NBA](https://chrome.google.com/webstore/detail/espn-nba-fantasy-team-aut/nmehekgchlioodlggejkfhiglajaonie)
- [NHL](https://chrome.google.com/webstore/detail/espn-nhl-fantasy-team-aut/nageaaodmancfbkhklidfjdhahghejle)

# How to build
Run `yarn unpacked` to create a folder suitable for loading as an unpacked extension in Chrome. `yarn package` creates a zipped version of the extension, ready to be uploaded to the extension store.

To build only the NBA extension, run `yarn unpacked-nba` or `yarn package-nba`. For the NHL extension, run `yarn unpacked-nhl` or `yarn package-nhl`.

# Bug reports
If the extension isn't working properly, please report a bug on the GitHub page. To help me figure out what the problem is, the following is very helpful:
1. Include screenshots or text that shows your roster and your league settings.
2. Check the developer console in your browser for any error messages.

To check for errors, do the following:
1. Open the developer console by pressing the F12 key, and go to the Console tab.
2. There's a dropdown that sets the log levels. Make sure the "Verbose" level is included so it says "All levels".
3. Clear the log by clicking the Clear button.
4. Click the Auto button added by the extension.
5. The extension should print some debug information to the console. If something goes wrong there may be a red error message or a yellow warning message as well. Either copy the relevant text or take a screenshot that contains all of it.
