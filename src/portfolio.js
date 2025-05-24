import { readFile, writeFile } from 'fs/promises';
import { getStockPriceData } from './api.js';

const FILE = './portfolio.json';
const INITIAL_BALANCE = 5000;

// load PF
export async function loadPortfolio() {
    try {
        const data = await readFile(FILE, 'utf-8');
        const portfolio = JSON.parse(data);

        if (typeof portfolio.balance !== 'number' || portfolio.balance < 0) {
            portfolio.balance = INITIAL_BALANCE;
        }
        return portfolio;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Could not find Portfolio-file. Initialise new Portfolio with balance.');
            return {
                balance: INITIAL_BALANCE,
                assets: {} // hier speichern Assets
            };
        } 
        console.log('Error while loading your Portfolio:', error);
        return {
            balance: INITIAL_BALANCE,
            assets: {}
        };
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

    const priceData = await getStockPriceData(upperSymbol);

    if (!priceData || typeof priceData.c !== 'number') {
        console.log(`\nCould not fetch price for ${upperSymbol}. Please try again.\n`);
        return;
    }

    const cost = priceData.c * amount;
    if (portfolio.balance < cost) {
        console.log(`\nNot enough credit. You've got ${portfolio.balance.toFixed(2)} €, but you need ${cost.toFixed(2)} €.\n`);
        return;
    }

    portfolio.balance -= cost;
    if (!portfolio.assets[upperSymbol]) {
        portfolio.assets[upperSymbol] = 0;
    }
    portfolio.assets[upperSymbol] += amount;

    await savePortfolio(portfolio);
    console.log(`\nBought ${amount} units of ${upperSymbol} for ${cost.toFixed(2)} €. Remaining balance: ${portfolio.balance.toFixed(2)} €.\n`);
}


// show PF
export async function showPortfolio() {
    const portfolio = await loadPortfolio();

    console.log('\n--- Your Portfolio ---\n');
    console.log(`Available Balance: ${portfolio.balance.toFixed(2)} €\n`);

    if (Object.keys(portfolio).length === 0) {
        console.log('\nYour portfolio is empty (no assets owned).\n');
        return;
    }
    console.log('Your Assets:');
    for (const symbol in portfolio.assets) {
        console.log(`- ${symbol}: ${portfolio.assets[symbol]} units`);
    }
    console.log('--------------------\n');
}