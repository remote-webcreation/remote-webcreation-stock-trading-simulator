import { readFile, writeFile } from 'fs/promises';

const FILE = './portfolio.json';

// load PF
export async function loadPortfolio() {
    try {
        const data = await readFile(FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// save PF
export async function savePortfolio(portfolio) {
    await writeFile(FILE, JSON.stringify(portfolio, null, 2), 'utf-8');
}

// buy stocks
export async function buyAsset(symbol, amount) {
    const portfolio = await loadPortfolio();
    const upperSymbol = symbol.toUpperCase();
    if (!portfolio[upperSymbol]) {
        portfolio[upperSymbol] = 0;
    }
    portfolio[upperSymbol] += amount;
    await savePortfolio(portfolio);
    console.log(`\nBought ${amount} of ${upperSymbol}.\n`);
}

// show PF
export async function showPortfolio() {
    const portfolio = await loadPortfolio();
    if (Object.keys(portfolio).length === 0) {
        console.log('\nYour portfolio is empty.\n');
        return;
    }
    console.log('\nYour portfolio:');
    for (const symbol in portfolio) {
        console.log(`- ${symbol}: ${portfolio[symbol]}`);
    }
    console.log();
}