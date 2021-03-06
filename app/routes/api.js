var express = require('express');
var router = express.Router();
var bittrex = require('node.bittrex.api');
var _ = require('lodash');
var fs = require('fs');

function checkBalancesRes(res, response) {
    if (
        response &&
        response.balances &&
        response.totalUSD &&
        response.totalBTC
    ) {
        res.json(data);
    }
}

function calculateTotalBTC(currencies, btcMarket) {
    var totalBTC = 0;

    Object.keys(currencies).forEach(function(symbol) {
        var currency = currencies[symbol];
        if (currency.Balance && currency.Last) {
            totalBTC += (currency.Balance * currency.Last);
        }
    });

    return totalBTC;
}

function calculateTotalUSD(totalBTC, btcMarket) {
    return totalBTC * btcMarket.Last;
}

/* GET balances */
router.get('/balances', function(req, res, next) {
    var currencies = {

    };
    var btcMarket;

    bittrex.getmarketsummaries(function(marketData, err) {
        if (marketData && marketData.result && Array.isArray(marketData.result)){
            bittrex.getbalances(function(balanceData, err) {
                if (balanceData && balanceData.result && Array.isArray(balanceData.result)){
                    balanceData.result.forEach(function(currency) {
                        currencies[currency.Currency] = currency;
                    });

                    marketData.result.forEach(function(market) {
                        if (
                            market.MarketName &&
                            market.MarketName.indexOf("BTC-") === 0
                        ) {
                            var currency = market.MarketName.split("BTC-")[1];
                            if (currencies[currency]) {
                                currencies[currency] = _.extend({}, currencies[currency], market);
                            }
                        } else if (market.MarketName === "USDT-BTC") {
                            btcMarket = market
                            if (currencies["BTC"]){
                                currencies["BTC"].Last = 1;
                            }
                        }
                    });

                    var totals = {};

                    totals.BTC = calculateTotalBTC(currencies, btcMarket);
                    totals.USD = calculateTotalUSD(totals.BTC, btcMarket);

                    currencies.totals = totals;
                    currencies.btcMarket = btcMarket;

                    var balanceString = `{btc: ${totals.BTC}, time:${new Date().getTime()}},`;
                    fs.appendFile('logs/balances.txt', balanceString, function (err) {
                      if (err) throw err;
                      console.log('Saved!');
                    });

                    res.json(currencies);
                } else {
                    res.json({});
                }
            });
        } else {
            res.json({});
        }
    });
});

/* GET balances */
router.get('/balance', function(req, res, next) {
    bittrex.getbalances(function(balanceData, err) {
        res.json(balanceData);
    });
});

router.get('/market', function(req, res, next) {
    bittrex.getmarketsummaries(function(data, err) {
        if (err) {
            return console.error(err);
        }
        res.json(data)
    });
});

router.get('/tickers', function(req, res, next) {
    bittrex.getmarketsummaries(function(data, err) {
        if (err) {
            return console.error(err);
        }
        var tickers = []
        for (var i in data.result) {
            bittrex.getticker({ market: data.result[i].MarketName }, function(ticker) {
                tickers.push(ticker)

                if (tickers.length === Object.keys(data.result).length) {
                    res.json(tickers)
                }
            });
        }
    });
});

router.get('/btc', function(req, res, next) {
    bittrex.sendCustomRequest("https://bittrex.com/api/v1.1/public/getmarketsummary?market=usdt-btc", function(data, err) {
        res.json(data)
    })
})

module.exports = router;