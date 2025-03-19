import { expect } from 'chai';
import { createRequire } from 'module';
import {app, webstackInstance} from '../login/index.js';
import request from 'supertest';

const require = createRequire(import.meta.url);

const puppeteer = require('puppeteer');

describe('Web Server', function () {
    let browser, page;

    this.beforeEach(async() => {
        browser = await puppeteer.launch({
            headless: true,
            slowMo: 50 // slow down operations for easier debugging
        });

        page = await browser.newPage();
        await page.goto("http://localhost:53134");
    });

    this.afterAll(async () => {
        webstackInstance.getHTTP().close(() => {
            console.log("Server closed");
            let redis = webstackInstance.getRedis();
            redis.quit();
        });
        await browser.close();
    });

    this.afterEach(async () => {
        await browser.close();
    })

    it('serve homepage', async function () {
        const res = await request(app).get("/");
        expect(res.status).to.equal(200);
        expect(res.text).to.include('<html');
    });

    it('find and click login button', async function() {
        const res = await request(app).get("/");

        expect(res.status).to.equal(200);
        expect(res.text).to.include('<html');

        await page.waitForSelector('#btnLogin');
        await page.click('#btnLogin');

        const buttonExists = await page.$('#btnLogin') !== null;
        expect(buttonExists).to.be.false;
        
    });

    it('display correct initial values for Well coincount and Wallet', async function () {
        await page.waitForSelector('#btnLogin');
        await page.click('#btnLogin');

        const buttonExists = await page.$('#btnLogin') !== null;
        expect(buttonExists).to.be.false;        

        await page.waitForSelector('div:nth-of-type(5) > div > div > span');

        const textContent = await page.$eval(
            'div:nth-of-type(5) > div > div > span',
            el => el.textContent.trim()
        );
    
        expect(textContent).to.include("Well coincount: 100000");
        expect(textContent).to.include("Wallet: 0");
    });

    it('take 1 coin from Well and add them to Wallet when clicking Take', async function () {
        await page.goto("http://localhost:53134/");
        await page.waitForSelector('#btnLogin');
        await page.click('#btnLogin');

        const buttonExists = await page.$('#btnLogin') !== null;
        expect(buttonExists).to.be.false;

        await page.waitForSelector('#passage-chat > span');

        let textContent = await page.$eval(
            '#passage-chat > span',
            el => el.textContent.trim()
        );        

        const wellMatch = textContent.match(/Well coincount: (\d+)/);
        const walletMatch = textContent.match(/Wallet: (-?\d+)/);
    
        expect(wellMatch).to.not.be.null;
        expect(walletMatch).to.not.be.null;
    
        let initialWell = parseInt(wellMatch[1]);
        let initialWallet = parseInt(walletMatch[1]);        

        await page.waitForSelector('#take > button');
        await page.click('#take > button');

        await page.waitForSelector('#passage-chat > span');

        textContent = await page.$eval(
            '#passage-chat > span',
            el => el.textContent.trim()
        );
    
        const newWellMatch = textContent.match(/Well coincount: (\d+)/);
        const newWalletMatch = textContent.match(/Wallet: (-?\d+)/);
    
        expect(newWellMatch).to.not.be.null;
        expect(newWalletMatch).to.not.be.null;
    
        let newWell = parseInt(newWellMatch[1]);
        let newWallet = parseInt(newWalletMatch[1]);
    
        // The change amount (assumed to be 1)
        let takeAmount = initialWell - newWell;
        expect(newWallet).to.equal(initialWallet + takeAmount);
    });

    it('give 1 coin back from Wallet to Well when clicking Give', async function () {
        await page.goto("http://localhost:53134/");
        await page.waitForSelector('#btnLogin');
        await page.click('#btnLogin');

        const buttonExists = await page.$('#btnLogin') !== null;
        expect(buttonExists).to.be.false;

        await page.waitForSelector('#passage-chat > span');

        let textContent = await page.$eval(
            '#passage-chat > span',
            el => el.textContent.trim()
        );        

        const wellMatch = textContent.match(/Well coincount: (\d+)/);
        const walletMatch = textContent.match(/Wallet: (-?\d+)/);
    
        expect(wellMatch).to.not.be.null;
        expect(walletMatch).to.not.be.null;
    
        let initialWell = parseInt(wellMatch[1]);
        let initialWallet = parseInt(walletMatch[1]);        

        await page.waitForSelector('#give > button');
        await page.click('#give > button');

        await page.waitForSelector('#passage-chat > span');

        textContent = await page.$eval(
            '#passage-chat > span',
            el => el.textContent.trim()
        );

        const newWellMatch = textContent.match(/Well coincount: (\d+)/);
        const newWalletMatch = textContent.match(/Wallet: (-?\d+)/);
    

        expect(newWellMatch).to.not.be.null;
        expect(newWalletMatch).to.not.be.null;
    
        let newWell = parseInt(newWellMatch[1]);
        let newWallet = parseInt(newWalletMatch[1]);
    
        // The change amount (assumed to be 1)
        let takeAmount = initialWell - newWell;
        expect(newWallet).to.equal(initialWallet + takeAmount);
    });

    // it('ensure the final Well and Wallet amounts are correct after concurrent operations', async function () {
    //     let NUM_USERS = 2;

    //     let promises = [];

    //     for (let i = 0; i < NUM_USERS; i++) {
    //         promises.push(new Promise(async(resolve, reject) => {
    //             try {
    //                 let newPage = await browser.newPage();
    //                 await newPage.goto("http://localhost:53134");
    //                 await newPage.waitForSelector('#btnLogin');
    //                 await newPage.click('#btnLogin');

    //                 console.log("login clicked");
            
    //                 const buttonExists = await newPage.$('#btnLogin') !== null;
    //                 expect(buttonExists).to.be.false;
            
    //                 // Wait for the Well & Wallet text
        
    //                 await newPage.waitForSelector('#passage-chat > span');
        
    //                 let textContent = await newPage.$eval(
    //                     '#passage-chat > span',
    //                     el => el.textContent.trim()
    //                 );

    //                 console.log("check initial values");
            
    //                 const wellMatch = textContent.match(/Well coincount: (\d+)/);
    //                 const walletMatch = textContent.match(/Wallet: (-?\d+)/);
            
    //                 expect(wellMatch).to.not.be.null;
    //                 expect(walletMatch).to.not.be.null;
            
    //                 let initialWell = parseInt(wellMatch[1]);
    //                 let initialWallet = parseInt(walletMatch[1]);
            
    //                 // Randomly decide whether to "Take" or "Give"
    //                 const action = Math.random() > 0.5 ? 'take' : 'give';
    //                 if (action === 'take') {
    //                     await newPage.waitForSelector('#take > button');
    //                     await newPage.click('#take > button');  // Click the "Take" button
    //                 } else {
    //                     await newPage.waitForSelector('#give > button');
    //                     await newPage.click('#give > button');  // Click the "Give" button
    //                 }

    //                 console.log("Give/Take clicked");
            
    //                 await newPage.waitForSelector('#passage-chat > span');
    //                 textContent = await newPage.$eval(
    //                     '#passage-chat > span',
    //                     el => el.textContent.trim()
    //                 );

    //                 console.log("Got new wallet and coincount from selector");
            
    //                 const newWellMatch = textContent.match(/Well coincount: (\d+)/);
    //                 const newWalletMatch = textContent.match(/Wallet: (-?\d+)/);
                
    //                 expect(newWellMatch).to.not.be.null;
    //                 expect(newWalletMatch).to.not.be.null;
            
    //                 let newWell = parseInt(newWellMatch[1]);
    //                 let newWallet = parseInt(newWalletMatch[1]);

    //                 console.log("Got all data, new resolving", { initialWell, initialWallet, newWell, newWallet });
            
    //                 // Return the results for later comparison
    //                 resolve([initialWell, initialWallet, newWell, newWallet ]);
    //             } catch (err) {
    //                 console.log("Error resolving promise: ", err);
    //                 reject(err);
    //             }
    //         }));
    //     }

    //     console.log(promises);
    
    //     // Wait for all pages to complete their actions
    //     const results = await Promise.all(promises).catch(err => {
    //         console.log("Error: ", err);
    //     });
    
    //     // Calculate the expected final Well and Wallet values
    //     let expectedWell = 100000;
    //     let expectedWallet = 0;
    
    //     results.forEach(({ initialWell, initialWallet, newWell, newWallet }) => {
    //         if (newWell < initialWell) {
    //             expectedWallet += (initialWell - newWell);  // Coins taken from Well
    //         }
    //         if (newWallet > initialWallet) {
    //             expectedWell += (newWallet - initialWallet);  // Coins given to Well
    //         }
    //     });
        
    //     console.log("Final res calc");

    //     page = await browser.newPage();

    //     await page.goto("http://localhost:53134/");
    //     console.log("Go to localhost");
    //     await page.waitForSelector('#btnLogin');
    //     console.log("Done wait for login");
    //     await page.click('#btnLogin');
    //     console.log("done click");

    //     const buttonExists = await page.$('#btnLogin') !== null;
    //     expect(buttonExists).to.be.false;

    //     await page.waitForSelector('#passage-chat > span');
    //     const finalTextContent = await page.$eval(
    //         '#passage-chat > span',
    //         el => el.textContent.trim()
    //     );

    //     console.log("Got data");
    
    //     const finalWellMatch = finalTextContent.match(/Well coincount: (\d+)/);
    //     const finalWalletMatch = finalTextContent.match(/Wallet: (\d+)/);
    
    //     expect(finalWellMatch).to.not.be.null;
    //     expect(finalWalletMatch).to.not.be.null;
    
    //     const finalWell = parseInt(finalWellMatch[1]);
    //     const finalWallet = parseInt(finalWalletMatch[1]);
    
    //     expect(finalWell).to.equal(expectedWell);
    //     expect(finalWallet).to.equal(expectedWallet);
    // });
    
});