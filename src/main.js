import inquirer from 'inquirer';
import dotenv from 'dotenv';
dotenv.config();

import chalk from 'chalk';
import { getStockPriceData } from './api.js';
import { categories } from './symbols.js';
import { buyAsset, showPortfolio, loadPortfolio, sellAsset } from './portfolio.js';

async function mainMenu() {
  try {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose from the menu below:\n',
        choices: [
          'Show stock price',
          'Buy stock',
          'Sell stock',
          'Portfolio',
          'History',
          'Exit'
        ]
      }
    ]);

    switch (action) {
        
      case 'Show stock price':

        const { categoryName: showCategoryName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'categoryName',
            message: 'Choose a category:\n',
            choices: categories.map(cat => cat.name)
          }
        ]);

        // find category with name
        const showCategory = categories.find(cat => cat.name === showCategoryName);

        if (!showCategory.symbols || showCategory.symbols.length === 0) {
          console.log('\nNo symbols available in this category.\n');
          break;
        }

        //choose symbol
        const { symbol: showChoosenSymbol } = await inquirer.prompt([
            {
              type: 'list',
              name: 'symbol',
              message: 'Choose a symbol:\n',
              choices: showCategory.symbols.map(item => ({
                name: `${item.name}`,
                value: item.symbol
              })).concat([
                new inquirer.Separator(),
                { name: 'Manuell eingeben', value: '__manual__' }
              ])
            }
        ]);

        // manual input
        let finalShowSymbol = showChoosenSymbol;
        if (showChoosenSymbol === '__manual__') {
          const { manualSymbol } = await inquirer.prompt([
            {
              type: 'input',
              name: 'manualSymbol',
              message: 'Enter stock/crypto symbol:'
            }
          ]);
          finalShowSymbol = manualSymbol;
        }

        // request price
        const priceData = await getStockPriceData(finalShowSymbol);


        if (priceData && typeof priceData.c === 'number' && typeof priceData.pc === 'number') {
          const currentPrice = priceData.c;
          const previousClose = priceData.pc; 
          const diff = currentPrice - previousClose; 
            
          let percentageChange = 0;
          if (previousClose !== 0) { 
            percentageChange = (diff / previousClose) * 100;
          }

          let colorFunc = chalk.white;
          let sign = '';

          if (diff > 0) {
            colorFunc = chalk.green;
            sign = '+'; 
          } else if (diff < 0) {
            colorFunc = chalk.red;
            sign = ''; 
          }
            
          console.log(
            `\nCurrent price of ${finalShowSymbol.toUpperCase()}: ${colorFunc(`$${currentPrice.toFixed(2)}`)} ${colorFunc(`(${sign}${percentageChange.toFixed(2)}%)`)}\n`
          );
        } else {
          console.log('\nCould not fetch price. Try another symbol.\n');
        }
        break;


      case 'Buy stock':

        // choose category
        const { categoryName: buyCategoryName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'categoryName',
            message: 'Choose a category to buy from:\n',
            choices: categories.map(cat => cat.name)
          },
        ]);
        
        const buyCategory = categories.find(cat => cat.name === buyCategoryName);

        if (!buyCategory.symbols || buyCategory.symbols.length === 0) {
          console.log('\nNo symbols available in this category to buy.\n'); 
          break; 
        }

        const { symbol: buyChoosenSymbol } = await inquirer.prompt([ 
          {
            type: 'list',
            name: 'symbol',
            message: 'Choose a symbol to buy:\n', 
            choices: buyCategory.symbols.map(item => ({
              name: `${item.name}`,
              value: item.symbol
            })).concat([
              new inquirer.Separator(),
              { name: 'Enter manually', value: '__manual__' } 
            ])
          }
        ]);

        let finalBuySymbol = buyChoosenSymbol; 
        if (buyChoosenSymbol === '__manual__') {
          const { manualSymbol } = await inquirer.prompt([
            {
              type: 'input',
              name: 'manualSymbol',
              message: 'Enter stock/crypto symbol to buy:' 
            }
          ]);
          finalBuySymbol = manualSymbol;
        }

        const priceDataForBuy = await getStockPriceData(finalBuySymbol);

        let currentPriceForBuy = null;
        if (priceDataForBuy && typeof priceDataForBuy.c === 'number' && typeof priceDataForBuy.pc === 'number') {
          currentPriceForBuy = priceDataForBuy.c;
          const previousClose = priceDataForBuy.pc;
          const diff = currentPriceForBuy - previousClose;

          let colorFunc = chalk.white;
          if (diff > 0) {
            colorFunc = chalk.green;
          } else if (diff < 0) {
            colorFunc = chalk.red;
          }
          console.log(`\nCurrent price of ${finalBuySymbol.toUpperCase()}: ${colorFunc(`$${currentPriceForBuy.toFixed(2)}`)}\n`);
        } else {
          console.log(chalk.red('\nCould not fetch current price for this symbol. Cannot proceed with purchase.\n'));
          break;
        }

        if (currentPriceForBuy === null) {
          console.log(chalk.red('Could not determine a valid price for purchase.'));
          break;
        }

        const { amount } = await inquirer.prompt([
          {
            type: 'number',
            name: 'amount',
            message: `How many units of ${finalBuySymbol.toUpperCase()} do you want to buy?`, 
            validate: input => input > 0 ? true : 'Enter a positive number.'
          }
        ]);
        await buyAsset(finalBuySymbol, amount);
        break;

      case 'Sell stock':
        const portfolio = await loadPortfolio();

        if (Object.keys(portfolio.assets || {}).length === 0) {
          console.log('\nYour portfolio is empty. No assets to sell.\n');
          break; 
        }

        console.log('\n--- Your Assets for Sale ---\n');
        const sellableChoices = [];

        for (const symbol in portfolio.assets) {
          const asset = portfolio.assets[symbol]; 
          const units = asset.units;

          if (units <= 0) {
            continue;
          }

          const priceDataForSell = await getStockPriceData(symbol);

          let priceOutput = 'N/A';
          let colorFunc = chalk.white;
          let currentPrice = null;

          if (priceDataForSell && typeof priceDataForSell.c === 'number' && typeof priceDataForSell.pc === 'number') {
            currentPrice = priceDataForSell.c;
            const previousClose = priceDataForSell.pc;
            const diff = currentPrice - previousClose;

            if (diff > 0) {
              colorFunc = chalk.green;
            } else if (diff < 0) {
              colorFunc = chalk.red;
            }
            priceOutput = `$${currentPrice.toFixed(2)}`;
          }

          console.log(`- ${symbol}: ${units} units | Current Price: ${colorFunc(priceOutput)}\n`);

          if (currentPrice !== null) {
            sellableChoices.push({
              name: `${symbol} (${units} units) - Sell Price: ${colorFunc(priceOutput)}`,
              value: symbol
            });
          } else {
            console.log(chalk.yellow(`  (Warning: Price for ${symbol} not available, cannot be sold currently.)`));
          }
        }
        console.log('----------------------------\n');

        if (sellableChoices.length === 0) {
          console.log(chalk.red('No assets with available prices to sell.\n'));
          break; 
        }

        const { symbol: sellChoosenSymbol } = await inquirer.prompt([
          {
            type: 'list',
            name: 'symbol',
            message: 'Choose an asset to sell:\n',
            choices: sellableChoices
          }
        ]);
        
        const availableUnits = portfolio.assets[sellChoosenSymbol].units;

        const { amount: sellAmount } = await inquirer.prompt([
          {
            type: 'number',
            name: 'amount',
            message: `How many units of ${sellChoosenSymbol} do you want to sell? (You own: ${availableUnits})`,
            validate: input => {
              if (isNaN(input) || input <= 0) {
                return 'Enter a positive number.';
              }
              if (input > availableUnits) {
                return `You only have ${availableUnits} units of ${sellChoosenSymbol}.`;
              }
              return true;
            }
          }
        ]);

        await sellAsset(sellChoosenSymbol, sellAmount);
        break;

      case 'Portfolio':
        await showPortfolio();
        break;
      case 'History':
        console.log("Feature coming soon!\n");
        break;
      case 'Exit':
        process.exit();
    }
    await mainMenu();
  } catch (error) {
    if (error.isTtyError || error.message?.startsWith('User force closed the prompt')) {
      console.log('\nApplication closed.');
      process.exit();
    } else {
      console.error('An error occurred:', error);
      process.exit(1);
    }
  }
}
mainMenu();
