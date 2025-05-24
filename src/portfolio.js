import { readFile, writeFile } from 'fs/promises';
import { getStockPriceData } from './api.js';
import chalk from 'chalk';

const FILE = './portfolio.json';
const INITIAL_BALANCE = 5000.00;

// load PF
export async function loadPortfolio() {
    try {
        const data = await readFile(FILE, 'utf-8');
        const portfolio = JSON.parse(data);

        if (typeof portfolio.initialBalance === 'undefined' || portfolio.initialBalance === null) {
            portfolio.initialBalance = INITIAL_BALANCE; 
        }

        // Ensure balance exists & is initial.
        if (typeof portfolio.balance !== 'number' || portfolio.balance < 0) {
            portfolio.balance = INITIAL_BALANCE;
        }
        // Ensure assets exist as an obj.
        if (typeof portfolio.assets !== 'object' || portfolio.assets === null) {
            portfolio.assets = {};
        }

        for (const symbol in portfolio.assets) {
            if (typeof portfolio.assets[symbol] === 'number') {
                console.warn(chalk.yellow(`Migrating old asset data for ${symbol}. Average price will be estimated or set to 0.`));
                portfolio.assets[symbol] = {
                    units: portfolio.assets[symbol],
                    avgPrice: 0 
                };
            } else if (typeof portfolio.assets[symbol] === 'object' && portfolio.assets[symbol] !== null) {
                if (typeof portfolio.assets[symbol].units !== 'number' || portfolio.assets[symbol].units < 0) {
                portfolio.assets[symbol].units = 0;
                }

                if (typeof portfolio.assets[symbol].avgPrice !== 'number' || portfolio.assets[symbol].avgPrice < 0) {
                    portfolio.assets[symbol].avgPrice = 0;
            
                }

            } else  {
                console.warn(chalk.yellow(`Unexpected asset data for ${symbol}. Initializing to default.`));
                portfolio.assets[symbol] = { units: 0, avgPrice: 0 };
            }
        }
        return portfolio;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Could not find Portfolio-file. Initialise new Portfolio with balance.');
            return {
                balance: INITIAL_BALANCE,
                initialBalance: INITIAL_BALANCE,
                assets: {} 
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
    const currentPrice = priceData.c;
    const cost = priceData.c * amount;

    // Check if the user has enough credit
    if (portfolio.balance < cost) {
        console.log(`\nNot enough credit. You've got ${portfolio.balance.toFixed(2)} €, but you need ${cost.toFixed(2)} €.\n`);
        return;
    }
    // Update balance
    portfolio.balance -= cost;

    if (!portfolio.assets[upperSymbol]) {
        portfolio.assets[upperSymbol] = { units: 0, avgPrice: 0 }; 
    }

    const existingUnits = portfolio.assets[upperSymbol].units;
    const existingTotalCost = existingUnits * portfolio.assets[upperSymbol].avgPrice;
    const newTotalCost = existingTotalCost + cost;
    const newUnits = existingUnits + amount;

    portfolio.assets[upperSymbol].units = newUnits;
    portfolio.assets[upperSymbol].avgPrice = newTotalCost / newUnits;

    await savePortfolio(portfolio);
    console.log(`\nYou've bought ${amount} units of ${upperSymbol} for ${cost.toFixed(2)} €.\n \n-> Remaining balance: ${portfolio.balance.toFixed(2)} €.\n`);
}

// sell stocks
export async function sellAsset(symbol, amount) {
    const portfolio = await loadPortfolio();
    const upperSymbol = symbol.toUpperCase();

    // Prüfen ob das Asset im Portfolio ist
    if (!portfolio.assets[upperSymbol] || portfolio.assets[upperSymbol] === 0) {
        console.log(`\nYou don't own any units of ${upperSymbol}.\n`);
        return;
    }
    // Prüfen ob genug Einheiten zum Verkauf vorhanden
    if (portfolio.assets[upperSymbol].units < amount) {
        console.log(`\nInsufficient units. You only have ${portfolio.assets[upperSymbol]} units of ${upperSymbol}.\n`);
        return;
    }

    const priceData = await getStockPriceData(upperSymbol);

    if (!priceData || typeof priceData.c !== 'number') {
        console.log(`\nCould not fetch price for ${upperSymbol}. Please try again.\n`);
        return;
    }

    const currentPrice = priceData.c;
    const revenue = currentPrice * amount; // Einnahmen aus Verkauf


    const avgPrice = portfolio.assets[upperSymbol].avgPrice;
    const investedCost = avgPrice * amount;
    const profitLoss = revenue - investedCost;

    let profitLossMessage = '';
    let returnPercentage = 0;

    if (profitLoss > 0) {
        returnPercentage = (profitLoss / investedCost) * 100;

         if (profitLoss > 0) {
            profitLossMessage = chalk.green(`(Profit: +${profitLoss.toFixed(2)} € / +${returnPercentage.toFixed(2)}%)`);
        } else if (profitLoss < 0) {
            profitLossMessage = chalk.red(`(Loss: ${profitLoss.toFixed(2)} € / ${returnPercentage.toFixed(2)}%)`);
        } else {
            profitLossMessage = `(Break-even: 0.00 € / 0.00%)`;
        }
    } else { // Wenn investedCost 0 ist
        if (profitLoss > 0) {
            profitLossMessage = chalk.green(`(Profit: +${profitLoss.toFixed(2)} € / N/A %)`); 
        } else if (profitLoss < 0) { 
            profitLossMessage = chalk.red(`(Loss: ${profitLoss.toFixed(2)} € / N/A %)`); 
        } else {
            profitLossMessage = `(P/L: 0.00 € / 0.00%)`; 
        }
    }


    // update credit
    portfolio.balance += revenue;

    portfolio.assets[upperSymbol].units -= amount;
    
    if (portfolio.assets[upperSymbol].units <= 0) {
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

    console.log('Your Assets:\n');

    let totalAssetsValue = 0;

    if (Object.keys(portfolio.assets || {}).length === 0) {
        console.log('Your portfolio is empty (no assets owned).\n');
    } else {
        for (const symbol in portfolio.assets) {
            const asset = portfolio.assets[symbol];
            
            if (asset.units <= 0) {
                continue;
            }

            const priceData = await getStockPriceData(symbol);

            let currentPrice = null;
            let priceOutput = 'N/A';
            let colorFunc = chalk.white;
            let profitLossMessage = '';

            if (priceData && typeof priceData.c === 'number' && typeof priceData.pc === 'number') {
                currentPrice = priceData.c;
                const previousClose = priceData.pc;
                const diff = currentPrice - previousClose;
                priceOutput = `$${currentPrice.toFixed(2)}`;

                if (diff > 0) {
                    colorFunc = chalk.green;
                } else if (diff < 0) {
                    colorFunc = chalk.red;
                }

                // Berechnung des Gewinns/Verlusts
                const avgPrice = asset.avgPrice;
                const investedCostPerAsset = avgPrice * asset.units; 

                const currentValuePerAsset = currentPrice * asset.units;

                const profitLossPerAsset = currentValuePerAsset - investedCostPerAsset;

                if (investedCostPerAsset > 0) {
                    const returnPercentagePerAsset = (profitLossPerAsset / investedCostPerAsset) * 100;
                    if (profitLossPerAsset > 0) {
                        profitLossMessage = chalk.green(`(P/L: +${profitLossPerAsset.toFixed(2)} € / +${returnPercentagePerAsset.toFixed(2)}%)`);
                    } else if (profitLossPerAsset < 0) {
                        profitLossMessage = chalk.red(`(P/L: ${profitLossPerAsset.toFixed(2)} € / ${returnPercentagePerAsset.toFixed(2)}%)`);
                    } else {
                        profitLossMessage = `(P/L: 0.00 € / 0.00%)`;
                    }
                } else {
                    // Fall, wenn investedCostPerAsset 0 ist (z.B. migrierte Daten)
                    if (profitLossPerAsset > 0) {
                        profitLossMessage = chalk.green(`(P/L: +${profitLossPerAsset.toFixed(2)} € / N/A %)`);
                    } else if (profitLossPerAsset < 0) {
                        profitLossMessage = chalk.red(`(P/L: ${profitLossPerAsset.toFixed(2)} € / N/A %)`);
                    } else {
                        profitLossMessage = `(P/L: 0.00 € / 0.00%)`;
                    }
                }

                totalAssetsValue += currentValuePerAsset;
            } else {
                console.log(chalk.yellow(`  (Warning: Price for ${symbol} not available.)`));
            }
            console.log(`-> ${symbol}: ${asset.units} units | Current Price: ${colorFunc(priceOutput)} ${profitLossMessage}`);
        }
    }

    console.log('\n--------------------');
    // totalAssetsValue ist hier jetzt im Scope und kann verwendet werden
    const totalCurrentValue = portfolio.balance + totalAssetsValue;
    const totalProfitLoss = totalCurrentValue - portfolio.initialBalance;

    let totalProfitLossMessage = '';
    let totalReturnPercentage = 0;

    if (portfolio.initialBalance > 0) {
        totalReturnPercentage = (totalProfitLoss / portfolio.initialBalance) * 100;

        if (totalProfitLoss > 0) {
            totalProfitLossMessage = chalk.green(`(Total Profit: +${totalProfitLoss.toFixed(2)} € / +${totalReturnPercentage.toFixed(2)}%)`);
        } else if (totalProfitLoss < 0) {
            totalProfitLossMessage = chalk.red(`(Total Loss: ${totalProfitLoss.toFixed(2)} € / ${totalReturnPercentage.toFixed(2)}%)`);
        } else {
            totalProfitLossMessage = `(Total P/L: 0.00 € / 0.00%)`;
        }
    } else {
        if (totalProfitLoss > 0) {
            totalProfitLossMessage = chalk.green(`(Total Profit: +${totalProfitLoss.toFixed(2)} € / N/A %)`);
        } else if (totalProfitLoss < 0) {
            totalProfitLossMessage = chalk.red(`(Total Loss: ${totalProfitLoss.toFixed(2)} € / N/A %)`);
        } else {
            totalProfitLossMessage = `(Total P/L: 0.00 € / 0.00%)`;
        }
    }
    console.log(`\nTotal Portfolio Value: ${totalCurrentValue.toFixed(2)} €\n`);
    console.log(`Initial Capital: ${portfolio.initialBalance.toFixed(2)} €\n`);
    console.log(`Overall Performance: ${totalProfitLossMessage}\n`);
    console.log('--------------------\n');
}