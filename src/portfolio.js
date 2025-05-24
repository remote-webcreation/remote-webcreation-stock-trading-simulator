import { readFile, writeFile } from 'fs/promises';
import { getStockPriceData } from './api.js';
import chalk from 'chalk';

const FILE = './portfolio.json';
const INITIAL_BALANCE = 5000;

// load PF
export async function loadPortfolio() {
    try {
        const data = await readFile(FILE, 'utf-8');
        const portfolio = JSON.parse(data);

        // Ensure balance exists and is initialized
        if (typeof portfolio.balance !== 'number' || portfolio.balance < 0) {
            portfolio.balance = INITIAL_BALANCE;
        }
        // Ensure assets exist as an object
        if (typeof portfolio.assets !== 'object' || portfolio.assets === null) {
            portfolio.assets = {};
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
    // Update balance
    portfolio.balance -= cost;

    if (!portfolio.assets[upperSymbol]) {
        portfolio.assets[upperSymbol] = 0; // speichert nur die Menge
    }
    portfolio.assets[upperSymbol] += amount;

    await savePortfolio(portfolio);
    console.log(`\nBought ${amount} units of ${upperSymbol} for ${cost.toFixed(2)} €. Remaining balance: ${portfolio.balance.toFixed(2)} €.\n`);
}

export async function sellAsset(symbol, amount) {

    const portfolio = await loadPortfolio();
    const upperSymbol = symbol.toUpperCase();

    // Prüfen ob das Asset im Portfolio ist
    if (!portfolio.assets[upperSymbol] || portfolio.assets[upperSymbol] === 0) {
        console.log(`\nYou don't own any units of ${upperSymbol}.\n`);
        return;
    }
    // Prüfen ob genug Einheiten zum Verkauf vorhanden
    if (portfolio.assets[upperSymbol] < amount) {
        console.log(`\nInsufficient units. You only have ${portfolio.assets[upperSymbol]} units of ${upperSymbol}.\n`);
        return;
    }

    const priceData = await getStockPriceData(upperSymbol);

    if (!priceData || typeof priceData.c !== 'number') {
        console.log(`\nCould not fetch price for ${upperSymbol}. Please try again.\n`);
        return;
    }

    const revenue = priceData.c * amount; // Einnahmen aus Verkauf

    // update credit
    portfolio.balance += revenue;

    portfolio.assets[upperSymbol] -= amount;
    
    if (portfolio.assets[upperSymbol] <= 0) {
        delete portfolio.assets[upperSymbol]; // Remove asset if no units left
    }

    await savePortfolio(portfolio);
    console.log(`\nSold ${amount} units of ${upperSymbol} for ${revenue.toFixed(2)} €. New balance: ${portfolio.balance.toFixed(2)} €.\n`);
}


// show PF
export async function showPortfolio() {
    const portfolio = await loadPortfolio();

    console.log('\n--- Your Portfolio ---\n');
    console.log(`-> Available Balance: ${portfolio.balance.toFixed(2)} €\n`);
    console.log('--------------------\n');

    if (Object.keys(portfolio.assets || {}).length === 0) {
        console.log('\nYour portfolio is empty (no assets owned).\n');
        console.log('--------------------\n');
        return;
    }

    console.log('Your Assets:\n');
    for (const symbol in portfolio.assets) {
        const units = portfolio.assets[symbol];

        const priceData = await getStockPriceData(symbol);

        let priceOutput = 'N/A';
        let colorFunc = chalk.white;

        if (priceData && typeof priceData.c === 'number' && typeof priceData.pc === 'number') {
                const currentPrice = priceData.c;
                const previousClose = priceData.pc;
                const diff = currentPrice - previousClose;

            if (diff > 0) {
                colorFunc = chalk.green;
            } else if (diff < 0) {
                colorFunc = chalk.red;
            }
            priceOutput = `$${currentPrice.toFixed(2)}`;
        }
        console.log(`- ${symbol}: ${units} units | Current Price: ${colorFunc(priceOutput)}`);
    }
    console.log('\n--------------------\n');
}