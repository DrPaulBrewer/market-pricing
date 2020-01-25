/* eslint max-params:"warn" */

const findZeroRange = require('find-zero-range');

function walrasianCEPriceRange(pLow, pHigh, pTol, qDemand, qSupply) {
  function excessSupply(p) { return (qSupply(p) - qDemand(p)); }
  const priceRange = findZeroRange(pLow, pHigh, pTol, excessSupply);
  // correction for integer prices and quantities when a supply order is needed for CE
  if ((priceRange.length === 1) &&
    (pTol === 1) &&
    (excessSupply(priceRange[0]) < 0) &&
    (qSupply(priceRange[0]) < qSupply(priceRange[0] + 1)))
    return [priceRange[0] + 1];
  return priceRange;
}

module.exports.walrasianCEPriceRange = walrasianCEPriceRange;

function demandFromQueue(buyQueue, bpCol, qCol) {
  return function (p) {
    let i = 0,
      l = buyQueue.length,
      totalQ = 0;
    while ((i < l) && (p <= buyQueue[i][bpCol])) {
      totalQ += buyQueue[i][qCol];
      ++i;
    }
    return totalQ;
  };
}

module.exports.demandFromQueue = demandFromQueue;

function supplyFromQueue(sellQueue, spCol, qCol) {
  return function (p) {
    let i = 0,
      l = sellQueue.length,
      totalQ = 0;
    while ((i < l) && (p >= sellQueue[i][spCol])) {
      totalQ += sellQueue[i][qCol];
      ++i;
    }
    return totalQ;
  };
}

module.exports.supplyFromQueue = supplyFromQueue;

function marshallianCEPriceRange(inframarginalBuyPrice,
  inframarginalSellPrice,
  extramarginalBuyPrice,
  extramarginalSellPrice) {
  if (extramarginalBuyPrice > inframarginalBuyPrice)
    throw new Error("marketPricing.marshallianCEPriceRange: invalid buy prices, extramarginal price must not be greater than inframarginal price");
  if (extramarginalSellPrice < inframarginalSellPrice)
    throw new Error("marketPricing.marshallianCEPriceRange: invalid sell prices, extramarginal price must not be less than inframarginal price");
  if (extramarginalBuyPrice >= extramarginalSellPrice)
    throw new Error("marketPricing.marshallianCEPriceRange: invalid extramarginal prices, extramarginal buy price should not equal or exceed extramarginal sell price");
  const cePriceRange = [
    (Math.max(extramarginalBuyPrice, inframarginalSellPrice) || inframarginalSellPrice),
    (Math.min(extramarginalSellPrice, inframarginalBuyPrice) || inframarginalBuyPrice)
  ];
  return cePriceRange;
}


module.exports.marshallianCEPriceRange = marshallianCEPriceRange;

function crossSingleUnitDemandAndSupply(buyPrices, sellPrices) {
  let l = Math.min(buyPrices.length, sellPrices.length),
    q0 = 0,
    q1 = 0;
  let ceIntersection;
  function mcMinusMV(q){ return (q<l)?(sellPrices[q]-buyPrices[q]): +Infinity; }
  if (l > 0) {
    [q0,q1] = findZeroRange(0,l,1,mcMinusMV);
    if (q0===undefined) {
      ceIntersection = {
        p: [buyPrices[0], sellPrices[0]],
        q: 0
      };
    } else {
      if (q1===undefined) q1=q0;
      if (buyPrices[q0]===sellPrices[q0]) q0-=1;
      if (q1 > q0) {

      /* in this case, buyPrices[j]===sellPrices[j] at q0<=j<q1 */

        ceIntersection = {
          p: buyPrices[q1],
          q: [q0+1, q1+1]
        };
      } else if (q1 === q0) {
        ceIntersection = {
          p: marshallianCEPriceRange(buyPrices[q1], sellPrices[q1], buyPrices[q1+1], sellPrices[q1+1]),
          q: q0+1
        };
        if (ceIntersection.p[0] === ceIntersection.p[1])
          ceIntersection.p = ceIntersection.p[0];
      } else {
        throw new Error("market-pricing, crossSingleUnitDemandAndSupply: impossible condition");
      }
    }
    return ceIntersection;
  }
}

module.exports.crossSingleUnitDemandAndSupply = crossSingleUnitDemandAndSupply;

function cross(buyQueue, sellQueue, bpCol, bqCol, spCol, sqCol) {
  if ((bpCol === undefined) ||
    (bqCol === undefined) ||
    (spCol === undefined) ||
    (sqCol === undefined))
    throw new Error("marketPricing.cross: missing 1 or more col parameters: " + ([bpCol, bqCol, spCol, sqCol].join(",")));
  let bidx = 0,
    sidx = 0,
    bl = buyQueue.length,
    sl = sellQueue.length;
  if ((!bl) || (!sl)) return undefined;
  let buyQ = [],
    sellQ = [],
    deltaQ = 0,
    totalQ = 0;
  let ibp, isp, ebp = buyQueue[0][bpCol],
    esp = sellQueue[0][spCol];
  if (ebp >= esp) {
    buyQ[0] = 0;
    sellQ[0] = 0;
  }
  while ((ebp >= esp) &&
    (bidx < bl) &&
    (sidx < sl)) {
    deltaQ = Math.min(buyQueue[bidx][bqCol] - buyQ[bidx], sellQueue[sidx][sqCol] - sellQ[sidx]);
    totalQ += deltaQ;
    // increment or initialize quantity bought/sold by deltaQ
    buyQ[bidx] += deltaQ;
    sellQ[sidx] += deltaQ;
    ibp = ebp;
    isp = esp;
    if (buyQueue[bidx][bqCol] === buyQ[bidx]) {
      bidx++;
      buyQ[bidx] = 0;
      ebp = (bidx < bl) ? (buyQueue[bidx][bpCol]) : undefined;
    }
    if (sellQueue[sidx][sqCol] === sellQ[sidx]) {
      sidx++;
      sellQ[sidx] = 0;
      esp = (sidx < sl) ? (sellQueue[sidx][spCol]) : undefined;
    }
  }
  if (totalQ === 0) return undefined;
  const priceRange = marshallianCEPriceRange(ibp, isp, ebp, esp);
  const price = (priceRange[0] + priceRange[1]) / 2;
  if (buyQ[bidx] === 0) buyQ.pop();
  if (sellQ[sidx] === 0) sellQ.pop();
  return [price, totalQ, buyQ, sellQ];
}

module.exports.cross = cross;

function sequential(buyQueue, sellQueue, tCol, bpCol, bqCol, spCol, sqCol) {
  if ((tCol === undefined) ||
    (bpCol === undefined) ||
    (bqCol === undefined) ||
    (spCol === undefined) ||
    (sqCol === undefined))
    throw new Error("marketPricing.sequential: missing 1 or more col parameters: " + ([tCol, bpCol, bqCol, spCol, sqCol].join(",")));
  let totalQ, prices, buyQ, sellQ, i, l, op;
  if ((!buyQueue.length) ||
    (!sellQueue.length) ||
    (buyQueue[0][bpCol] < sellQueue[0][spCol])) return undefined;
  const crossResult = cross(buyQueue, sellQueue, bpCol, bqCol, spCol, sqCol);
  if (crossResult === undefined) return undefined;
  totalQ = crossResult[1];
  buyQ = crossResult[2];
  sellQ = crossResult[3];
  prices = [];
  if (buyQueue[0][tCol] < sellQueue[0][tCol]) {
    op = 's';
    if (sellQ[1]) throw new Error("marketPricing.sequential: non-sequential trades on sell side");
    for (i = 0, l = buyQ.length;i<l;++i)
      prices[i] = buyQueue[i][bpCol];
  } else {
    op = 'b';
    if (buyQ[1]) throw new Error("marketPricing.sequential: non-sequential trades on buy side");
    for (i = 0, l = sellQ.length;i<l;++i)
      prices[i] = sellQueue[i][spCol];
  }
  return [op, prices, totalQ, buyQ, sellQ];
}

module.exports.sequential = sequential;
