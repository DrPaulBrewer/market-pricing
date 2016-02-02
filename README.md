market-pricing
=====
[![Build Status](https://travis-ci.org/DrPaulBrewer/market-pricing.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/market-pricing)
[![Coverage Status](https://coveralls.io/repos/github/DrPaulBrewer/market-pricing/badge.svg?branch=master)](https://coveralls.io/github/DrPaulBrewer/market-pricing?branch=master)


#### Copyright 2016 Paul Brewer, Economic & Financial Technology Consulting LLC <drpaulbrewer@eaftc.com>

#### Open Source License: The MIT License

npm Javascript package of algorithms for finding competitive equilibrium prices from demand and supply functions or sorted order queues.

Intended application:
  
A building block for 
   * teaching and research simulations with robot traders
   * market experiments or demonstrations with human subjects
   * policy studies
   * developing new kinds of market rules or order types
   * other types of exchange markets, e.g. resource tokens, prediction, etc.



##Installation

    npm install market-pricing --save

## Usage

    var marketPricing = require('market-pricing');

###Data Requirements

Most functions require economically pre-sorted arrays of buy and sell orders.
That is, buy orders should be sorted price descending, highest price first.
Sell orders should be sorted price ascending, with the lowest price first.

Each order may be an Array of arbitrary length with as many other fields as necessary for a given application.  Objects might also work, but are untested in this version. 

`cross`, `demandFromQueue`, and `supplyFromQueue` require the array indexes for "buy price", "buy quantity", "sell price", and "sell quantity".  

The `sequential()` function also requires a timestamp or ordernumber
index so that it can tell which buy or sell orders occurred before other orders.

Example:

    // set up price-sorted buy (descending) and sell (ascending) order lists
    // bob wants 1 at price of 300, fred wants 1 at price of 250
    var buyerList = [['bob',1,300],['fred',1,250]]; 
    // sue will sell 1 at price of 200, alice will sell 1 at price of 280
    var sellerList = [['sue',1,200],['alice',1,280]];
    
###Functionality

####Walrasian Tantonnement 

Walrasian Tatonnement is a price-search procedure often attributed to
Walras, whereby the price is raised if there is excess demand, and lowered if
there is excess supply, until a price is found where the demand and supply equal.

The price where demand and supply equal is called the competitive equilibrium.

    var priceRange = marketPricing.walrasianCEPriceRange(
       pLow /* lower limit of price search, number */,
       pHigh /* upper limit of price search,  number */,
       pTol /* tolerance of price search, number, >=1 forces integer result */,
       qDemand /* function(p){...} returning quantity demanded for price p */,
       qSupply /* function(p){...} returning quantity supplied for price p */
    );
    

Starting with the `buyerList` and `sellerList` in the example above, we can use the helper functions `demandFromQueue` and `supplyFromQueue` to setup demand and supply functions for calculating the CE as follows:

    var qDFunc = marketPricing.demandFromQueue(
        buyerList,
        2 /* index for price in each item of buyerList ArrayOfArray */,
        1 /* index for quantity in each item of buyerList ArrayOfArray */);

    var qSFunc = marketPricing.supplyFromQueue(
        sellerList,
        2 /* index for price in each sellerList item */,
        1 /* index for quantity in each sellerList item */);


 You might then notice that `qDFunc(0)` returns 2 because both Bob and Fred would
buy 1 unit, for a total of 2 units,  if the price were zero. Similarly, `qSFunc(0)` returns 0 because neither seller will sell for a price of zero.

Now to search for a Walrasian Competitive Equilibirum Price Range between prices of 0 and 500, with a tolerance of 1 price unit, execute:

     marketPricing.walrasianCEPriceRange(0,500,1,qDFunc,qSFunc) 
     --> [ 251, 279 ]

This indicates a competitive equilibrium price range of `251<=P<=279`.

Let's check the example to see if this makes sense.  At price P in `251<=P<=279`, 
Bob wants to buy one because he was willing to pay 300, and Fred will buy zero because he was willing to pay 250 only and `P>250`, Sue sells one because she would sell for
a price of 200 or more, and Alice will not sell because she wanted a price of 280.
Therefore for the prices P in `251<=P<=279` there is one unit of demand and one unit
of supply and the market is in competitive equilibrium.  

Notice how the prices of the excluded buyer and seller help set the limits of the range.  If the price were 250, Fred would buy, but there is no 2nd unit of supply at that price to sell to Fred.  If the price were 280, Alice would sell but there is no 2nd unit of demand at that price, no buyer to buy from Alice.   

####Marshallian Competitive Equilibrium

A **different** technique which yields reasonably consistent results is attributed to
to Marshall and involves finding the intersection of supply and demand curves on
a two dimensional chart, with axes of price and quantity.  

In the case of integer quantities, the supply and demand curves become step functions and
the intersection can either be a point (exact price and quantity), a
horizontal segment (exact Price and a range of quantities), or a vertical segment
(exact quantity and a range or prices).  

The helper function 

     marketPricing.marshallianCEPriceRange(inframarginalBuyPrice,
                                           inframarginalSellPrice,
                                           extrmarginalBuyPrice,
                                           extramarginalSupplyPrice)

checks the input against each other for validity, and throws an error if, e.g. the extramarginal unit could trade or
the prices are in the wrong sort order.  

Valid usage always returns a two element array representing the lower and upper bounds of the price range.

The lower bound is given by the larger of `inframarginalSellPrice` and `extraMarginalBuyPrice`.

The upper bound is given bu the smaller of `inframarginalBuyPrice` and `extraMarginalSellPrice`.

If one or both of the extramarginal prices do not exist, the usage is still valid, and the undefined value is simply ignored in the formula.

####Call Markets: Crossing Order Queues to obtain CE price and trades

The `marketPricing.cross(buyQueue,sellQueue,bpCol,bqCol,spCol,sqCol)` function, on success, returns a 4 element array: [price, totalQuantity, buyQuantityArray, sellQuantityArray]
where the buyQuantityArray and sellQuantityArrays provide the quantities traded from individual orders in buyQueue and sellQueue.

`cross` assumes that `buyQueue` is sorted with the highest price buy order as buyQueue[0], with subsequent buy orders equal or lower in price,
and assumes that `sellQueue` is sorted with the lowest price sell order as sellQueue[0], with subsequent sell orders equal or higher in price.

`cross` does NOT sort the `buyQueue` and `sellQueue` because sorting can be costly if the queues are large.  This also allows a developer flexibility in when and how
often the queues are sorted, provided they are always in sort order when cross or other market-pricing routines are called. 

`cross` operates by walking the Marhsllian path matching orders from the buyQueue and sellQueue until the inframarginal and extramarginal prices are identified. It then
feeds these prices to `marshallianCEPriceRange` to obtain the price range, and calculates the midpoint price from this range. 

The set of trades identified in the buyQuantityArray and sellQuantityArray can be considered optimal in the sense that the sum of the surplus between the ordered prices and achieved price
over the set of all traders are maximized.   

Note that even if all prices are integers, the midpoint could be between integers. Caution is advised rounding up or down to an integer price.  It is probably OK to do so only when prices are always integers, and the quantities returned in the buyQuantityArray and sellQuantityArray are used as the traded quantities.  

`cross` checks for validity, throwing an error if any of the *Col variables
are undefined.  The *Col variables are for specifying the format of your order data, specifically, the column number or property name for buy price (bpC0l), 
the buy quantity column name or number (bqCol), the sell price column name or number (spCol), and the sell quantity column name or number (sqCol).

simple example:

    // bob wants 1 at price of 300, fred wants 1 at price of 250
    var buyerList = [['bob',1,300],['fred',1,250]]; 
    // sue will sell 1 at price of 200, alice will sell 1 at price of 280
    var sellerList = [['sue',1,200],['alice',1,280]];
    marketPricing.cross(buyerList,sellerList,2,1,2,1);
    -->  [ 265, 1, [ 1 ], [ 1 ] ]

The result means that the price is 265, total quantity traded is 1, trading 1 unit from bob's order buy, and 1 unit from sue's sell order.

Note that the price of 265 was obtained from the midpoint of the Marshllian price range calculation, but also matches the midpoint of the earlier Walrasian method.

####Sequential Markets: Finding the trades from a single order

The `marketPricing.sequential(buyQueue,sellQueue,tCol,bpCol,bqCol,spCol,sqCol)` is used to check for prices and traded quantities after each single order.

A valid return is either undefined, indicating no trade, or

    ['b' or 's',[prices],totalQuantity,buyQuantityArray,sellQuantityArray]

where 'b' or 's' indicates that the last order is a buy or a sell, the [prices] array is an array of the price from each matched order, and the buyQuantityArray
and sellQuantityArray indicate the amount traded from each order as explained above for `cross()`.  

The new order should be placed in the proper sorted queue before calling.  The tCol indicates the time column.  Any kind of ascending column, like an order number,
can be used as the time column.  

Internally in `sequential()`, the `cross()` function is used to find the quantities traded.

The price from `cross` is discarded, and prices are determined from the orders themeselves.  The pricing rule is that the price of the earlier order determines the trade price.
This means, for instance, that a large buy order will be filled at various prices corresponding to first the lowest price sell order, then the next higher, etc., until the buy order is filled
or there are no more sell order with a price less than that of the buy order.  

`sequential()` is intended as a building block for a sequential trading engine, but is not the complete engine.  After each trade, adjustments to the queues are required
before calling `sequential()` again with a new order.  

In our previous example with Bob, Fred, Alice, and Sue, the prices and trades would depend on the time order.

Scenario A:

1. No buy orders. Alice places sell order for 1 unit @ 280.  `sequential()` would return `undefined` (no trade).
2. Bob places a buy order for 1 unit @ 300.  Now `sequential()` would return [[280],1,[1],[1]], indicating a trade at the earlier price of 280.
3. Clearing out the traded orders from the buy and sell queues manually would result in empty buy and sell queues.
4. next Fred places a buy order for 1 unit @ 250.  There are no sell orders yet.
5. Sue places a sell order for 1 unit @ 200.  `sequential()` would return [[250],1,[1],[1]]), indicating a trade at the earlier price of 250.

Scenario A results in 2 trades, 1 trade @ 280 and 1 trade @ 250.

Scenario B:
1. No buy orders. Sue places sell order 1 unit @ 200.  
2. Bob places a buy order for 1 unit @ 300.  Now `sequential()` would return [[200],1,[1],[1]] indicating a trade at the earlier price of 200.
3. Clearing out the traded orders from the buy and sell queues manually would result in empty buy and sell queues.
4. next Alice places a sell order for 1 unit @280.  no trades.
5. next Fred places a buy order for 1 unit @250.  `sequential()` would return undefined, as Fred's buy price is less than Alice's sell price.

With the same orders as Scenario A, but in a different sequence, scenario B results in only 1 trade @ 200.

