try {
    const shoukaku = require('./node_modules/shoukaku/package.json').version;
    console.log(`Installed Shoukaku: ${shoukaku}`);
} catch (e) { console.log("Shoukaku not found"); }

try {
    const kazagumo = require('./node_modules/kazagumo/package.json').version;
    console.log(`Installed Kazagumo: ${kazagumo}`);
} catch (e) { console.log("Kazagumo not found"); }
