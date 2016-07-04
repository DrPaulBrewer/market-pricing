var assert = require('assert');
var should = require('should');
var marketPricing = require("../index.js");

describe('marketPricing', function(){
    'use strict';
    describe('walrasianCEPriceRange', function(){
	it('should solve a simple symmetric supply/demand problem with step functions', function(){
	    var qD = function(p){ return Math.max(0, Math.ceil(100-2*p)); };
	    var qS = function(p){ return Math.min(100, Math.floor(2*p)); };
	    // equilibrium price is 25.00-25.50, equilibrium quantity 50
	    var priceRange = marketPricing.walrasianCEPriceRange(0,50,0.01,qD,qS);
	    priceRange[0].should.be.approximately(25.00,0.01);
	    priceRange[1].should.be.approximately(25.50,0.01);
	});
    });
    describe('demandFromQueue', function(){
	var buyorders = [
	    [100,5],
	    [80,4], //  9
	    [75,2], // 11
	    [50,1], // 12
	    [25,10] // 22
	];
	var i;
	var answer = [];
	for(i=0;i<26;++i) answer[i]=22;
	for(i=26;i<51;++i) answer[i]=12;
	for(i=51;i<76;++i) answer[i]=11;
	for(i=76;i<81;++i) answer[i]=9;
	for(i=81;i<101;++i) answer[i]=5;
	for(i=101;i<200;++i) answer[i]=0;
	it('should match manually calculated aggregate for 5 buy orders', function(){
	    var qD = marketPricing.demandFromQueue(buyorders,0,1);
	    for(i=0;i<200;++i) qD(i).should.eql(answer[i]);
	});
    });
    describe('supplyFromQueue', function(){
	var sellOrders = [
	    [7, 5],  //  7
 	    [3, 20], // 10
	    [5, 40], // 15
	    [2, 60], // 17
	    [3, 70], // 20
	    [2, 80]  // 22
	];
	var i;
	var answer = [];
	for(i=0;i<5;++i) answer[i] = 0;
	for(i=5;i<20;++i) answer[i] = 7;
	for(i=20;i<40;++i) answer[i] = 10;
	for(i=40;i<60;++i) answer[i] = 15;
	for(i=60;i<70;++i) answer[i] = 17;
	for(i=70;i<80;++i) answer[i] = 20;
	for(i=80;i<200;++i) answer[i] = 22;
	it('should match manually calculated aggregate for 5 sell orders', function(){
	    var qS = marketPricing.supplyFromQueue(sellOrders,1,0);
	    for(i=0;i<200;++i) qS(i).should.eql(answer[i]);
	});
    });	
    describe('walrasianCEPriceRange+demandFromQueue+supplyFromQueue', function(){
	it('should find competitive equilibrium for above 5 buy / 5 sell orders matching manual calculation', function(){
	    var buyOrders = [
		[100,5],
		[80,4], //  9
		[75,2], // 11
		[50,1], // 12
		[25,10] // 22
	    ];
	    var sellOrders = [
		[7, 5],  //  7
 		[3, 20], // 10
		[5, 40], // 15
		[2, 60], // 17
		[3, 70], // 20
		[2, 80]  // 22
	    ];
	    // CE is at price 40, quantity 12
	    marketPricing.walrasianCEPriceRange(
		0,
		100,
		1,
		marketPricing.demandFromQueue(buyOrders,0,1),
		marketPricing.supplyFromQueue(sellOrders,1,0)
	    ).should.be.eql([40]);	    
	}); 
    });
    describe('marshallianCEPriceRange', function(){
	describe('exception detection', function(){
	    it('should throw if extramarginal unit could trade', function(){
		function xCouldTrade(){
		    var ibp = 100, ebp=90, isp=20, esp=30;
		    var p=marketPricing.marshallianCEPriceRange(ibp,isp,ebp,esp);
		}
		xCouldTrade.should.throw();
	    });
	    it('should throw if extramarginal and inframarginal are reversed', function(){
		var ibp = 100, ebp=30, isp=40, esp = 70;
		function test1(){
		    return marketPricing.marshallianCEPriceRange(ibp,esp,ebp,isp);
		}
		function test2(){
		    return marketPricing.marshallianCEPriceRange(ebp,isp,ibp,esp);
		}
		function test3(){
		    return marketPricing.marshallianCEPriceRange(ebp,esp,ibp,isp);
		}
		test1.should.throw();
		test2.should.throw();
		test3.should.throw();
	    });	    
	});
	describe('Demand of 2 units at P=100 intersects Supply at Q=1 90<=P<110', function(){
	    var ibp=100,ebp=100,isp=90,esp=110;
	    it('should return ce price range [100,100]', function(){
		marketPricing.marshallianCEPriceRange(ibp,isp,ebp,esp).should.eql([100,100]);
	    });
	    it('walrasianCEPriceRange should match at [100]', function(){
		var qD = marketPricing.demandFromQueue([[1,ibp],[1,ebp]],1,0);
		var qS = marketPricing.supplyFromQueue([[1,isp],[1,esp]],1,0);
		marketPricing.walrasianCEPriceRange(0,1000,1,qD,qS).should.eql([100]);
	    });
	});
	describe('Supply of 2 units at P=50 intersects intersects demand at Q=1 40<P<=75', function(){
	    var ibp=75,ebp=40,isp=50,esp=50;
	    it('should return ce price range [50,50]', function(){
		marketPricing.marshallianCEPriceRange(ibp,isp,ebp,esp).should.eql([50,50]);
	    });
	    it('walrasianCEPriceRange should match at [50]', function(){
		var qD = marketPricing.demandFromQueue([[1,ibp],[1,ebp]],1,0);
		var qS = marketPricing.supplyFromQueue([[1,isp],[1,esp]],1,0);
		marketPricing.walrasianCEPriceRange(0,1000,1,qD,qS).should.eql([50]);
	    });
	});
	describe('Demand/Supply intersect after first unit, extramarginals determine price range [65,70]', function(){
	    var ibp=100, ebp=65, isp=30, esp=70;
	    it('should return ce price range [65,70]', function(){
		marketPricing.marshallianCEPriceRange(ibp,isp,ebp,esp).should.eql([65,70]);
	    });
	    it('walrasianCEPriceRange should match [66,69] instead', function(){
		var qD = marketPricing.demandFromQueue([[1,ibp],[1,ebp]],1,0);
		var qS = marketPricing.supplyFromQueue([[1,isp],[1,esp]],1,0);
		marketPricing.walrasianCEPriceRange(0,1000,1,qD,qS).should.eql([66,69]);
	    });
	});
    });


    describe('crossSingleUnitDemandAndSupply', function(){
	var cross1 = marketPricing.crossSingleUnitDemandAndSupply;
	it('should throw if parameter(s) missing', function(){
	    cross1.bind({}).should.throw();
	    cross1.bind({},[]).should.throw();
	    cross1.bind({},undefined,[]).should.throw();
	});
	it('should return undefined for one or both empty arrays',function(){
	    assert.ok(cross1([],[10,20,30])===undefined);
	    assert.ok(cross1([30,20,10],[])===undefined);
	});

	var testcases = [
	    [ { p: [20,30], q:0}, [20], [30] ], // no trade, price represents bid-ask spread
	    [ { p: [150,160], q:0}, [150,140], [160, 200] ], // still no trade	 
	    [ { p: [100,110], q:1}, [110], [100] ], // single trade, inframarginal determine price range
	    [ { p: [200,220], q:5}, [300,250,250,240,240,200,180,150], [100,150,175,190,190,220,230,250] ], // extramarginals determine price range
	    [ { p: 22, q:[3,7]}, [40,30,22,22,22,22,22,20,10], [10,15,20,22,22,22,22,30] ], // horizontal intersection, point price, range of q
	    [ { p:50, q:3 },  [50, 50, 50, 50, 50 ] , [20, 30, 40, 60, 70, 80] ], // horizontal demand creates point intersection
	    [ { p:100, q:4 }, [300,200,150,125,75,50], [100,100,100,100,100,100] ] // horizontal supply creates point intersection
	];
	
	testcases.forEach(function(T){
	    it('should return '+JSON.stringify(T[0])+' for buyPrices '+JSON.stringify(T[1])+' sellPrices '+JSON.stringify(T[2]),
	       function(){
		   cross1(T[1],T[2]).should.deepEqual(T[0]);
	       });
	});
	    
    });


    describe('cross', function(){
	it('should throw if column index parameters are omitted', function(){
	    marketPricing.cross.bind({},[],[]).should.throw();
	});
	it('should return undefined for Buy [] Sell []', function(){
	    assert.ok(marketPricing.cross([],[],1,0,1,0)===undefined);
	});
	it('should return undefined for Buy [1@100] Sell []', function(){
	    assert.ok(marketPricing.cross([[1,100]],[],1,0,1,0)===undefined);
	});
	it('should return undefined for Buy [] Sell [1@110]', function(){
	    assert.ok(marketPricing.cross([],[[1,110]],1,0,1,0)===undefined);
	});
	it('should return undefined for Buy [1@100]  Sell [1@110]', function(){
	    assert.ok(marketPricing.cross([[1,100]],[[1,110]],1,0,1,0)===undefined);
	});
	it('should return [105,1,[1],[1]] for Buy [1@110] Sell [1@100]',
	   function(){
	       var pcross = marketPricing.cross([[1,110]],[[1,100]],1,0,1,0);
	       pcross.should.eql([105,1,[1],[1]]);
	   });
	it('should return [100,1,[1],[1]] for Buy [2@100] Sell [1@90, 1@110]',
	   function(){
	       var pcross = marketPricing.cross([[2,100,0]],
						[[1,,90],[1,,110]],
						1,
						0,
						2,
						0);
	       pcross.should.eql([100,1,[1],[1]]);
	   });
	it('should return [50,1,[1],[1]] for Buy [1@75,1@40] Sell [2@50]',
	   function(){
	       var pcross = marketPricing.cross([[1,75],[1,40]],[[2,,50]],1,0,2,0);
	       pcross.should.eql([50,1,[1],[1]]);
	   });
	it('should return [67.5,1,[1],[1]] for Buy [1@100,1@65] Sell [1@30, 1@70]',
	   function(){
	       var pcross = marketPricing.cross([[1,100],[1,65]], [[1,,30],[1,,70]],1,0,2,0);
	       pcross.should.eql([135/2,1,[1],[1]]);
	   });
	it('should return [70,20,[5,5,2,2,2,2,2],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]',
	   function(){
	       var i,l,buyOrders=[],sellOrders=[];
	       for(i=0,l=50;i<l;++i)
		   sellOrders[i] = [1,,51+i];
	       buyOrders[0] = [5,105];
	       buyOrders[1] = [5,100];
	       for(i=0,l=20;i<l;++i)
		   buyOrders[2+i] = [2,86-4*i];
	       var pcross = marketPricing.cross(buyOrders,sellOrders,1,0,2,0);
	       pcross.should.eql([70,20,[5,5,2,2,2,2,2],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]);
	   });
    });
    describe('sequential', function(){
	it('should throw if column index parameters are omitted', function(){
	    marketPricing.sequential.bind({},[],[]).should.throw();
	});
	it('should return undefined for Buy [] Sell []', function(){
            assert.ok(marketPricing.sequential([],[],0,2,1,2,1)===undefined);
        });
        it('should return undefined for Buy [1@100] Sell []', function(){
            assert.ok(marketPricing.sequential([[1,1,100]],[],0,2,1,2,1)===undefined);
        });
        it('should return undefined for Buy [] Sell [1@110]', function(){
            assert.ok(marketPricing.sequential([],[[2,1,110]],0,2,1,2,1)===undefined);
        });
        it('should return undefined for Buy [1@100]  Sell [1@110]', function(){
            assert.ok(marketPricing.sequential([[1,1,100]],[[2,1,110]],0,2,1,2,1)===undefined);
        });
	it('should return [s,[110],1,[1],[1]] for Buy [1@110] Sell [1@100]',
           function(){
               var pseq = marketPricing.sequential(
		   [[1000,1,110]],
		   [[2000,1,100]],
		   0,2,1,2,1
	       );
               pseq.should.eql(['s',[110],1,[1],[1]]);
           });
	it('should return [b,[100],1,[1],[1]] for Sell [1@100] Buy[1@110]',
	   function(){
	       var pseq = marketPricing.sequential(
		   [[2000,1,110]],
		   [[1000,1,100]],
		   0,2,1,2,1
	       );
	       pseq.should.eql(['b',[100],1,[1],[1]]);
	   });
	it('should return [s,[100],1,[1],[1]] for Buy [2@100] Sell [1@100]',
           function(){
               var pseq = marketPricing.sequential(
		   [[1000,2,100]],
		   [[2000,1,100]],
		   0,2,1,2,1
	       );
               pseq.should.eql(['s',[100],1,[1],[1]]);
           });
	it('should return [s,[100],2,[2],[2]] for Buy [2@100] Sell [2@100]',
           function(){
               var pseq = marketPricing.sequential(
		   [[1000,2,100]],
		   [[2000,2,100]],
		   0,2,1,2,1
	       );
               pseq.should.eql(['s',[100],2,[2],[2]]);
           });
	it('should throw for Buy [2@100] Sell [1@100] Sell[1@100]',
           function(){
	       function not1atatime(){
		   var pseq = marketPricing.sequential(
		       [[1000,2,100]],
		       [[2000,1,100],[3000,1,100]],
		       0,2,1,2,1
		   );
		   return pseq;
	       }
               not1atatime.should.throw();
           });
	it('should throw for Sell[2@100] Buy[1@100] Buy[1@100]',
	   function(){
	       function not1atatime(){
		   var pseq = marketPricing.sequential(
		       [[2000,1,100],[3000,1,100]],
		       [[1000,2,100]],
		       0,2,1,2,1
		   );
		   return pseq;
	       }
               not1atatime.should.throw();
	   });
    });
    describe('random stress test, 50000 random orders', function(){
	var i,l=25000;
	var p0=100,p1=500,q0=1,q1=19;
	var buyOrder=[],sellOrder=[];
	for(i=0;i<l;++i){
	    buyOrder[i]=[10000*Math.random(),
			 Math.floor(q0+(q1-q0)*Math.random()),
			 Math.floor(p0+(p1-p0)*Math.random()),
			 0];
	    sellOrder[i]=[10000*Math.random(),
			  Math.floor(q0+(q1-q0)*Math.random()),
			  0,
			  Math.floor(p0+(p1-p0)*Math.random())];
	};
	var buyQueue=buyOrder.slice();
	buyQueue.sort(function(a,b){ return +b[2]-a[2];});
	var sellQueue=sellOrder.slice();
	sellQueue.sort(function(a,b){ return +a[3]-b[3];});
	var qD = marketPricing.demandFromQueue(buyQueue,2,1);
	var qS = marketPricing.supplyFromQueue(sellQueue,3,1);
	var wPrices = marketPricing.walrasianCEPriceRange(p0,p1,1,qD,qS);
	var wPrice = (wPrices.length==2)?((wPrices[0]+wPrices[1])/2):(wPrices[0]);
	var crossResult = marketPricing.cross(buyQueue,sellQueue,2,1,3,1);
	it('should have cross price between p0 and p1', function(){
	    assert.ok(crossResult[0]>p0);
	    assert.ok(crossResult[0]<p1);
	});
	// serialize sorted queues to single units and try crossSingleUnitDemandAndSupply for comparison
	var demandPrices=[], supplyPrices=[];
	buyQueue.forEach(function(B){
	    var q=B[1],p=B[2];
	    Array.prototype.push.apply(demandPrices, Array(q).fill(p));
	});
	
	sellQueue.forEach(function(S){
	    var q=S[1],p=S[3];
	    Array.prototype.push.apply(supplyPrices, Array(q).fill(p));
	});
	var ce = marketPricing.crossSingleUnitDemandAndSupply(demandPrices,supplyPrices);
	it('should have defined ce with p,q properties and proper types', function(){
	    ce.should.have.properties('p','q');
	    assert.ok(typeof(ce.p)==='number' || Array.isArray(ce.p));
	    assert.ok(typeof(ce.q)==='number' || Array.isArray(ce.q));
	    assert.ok( !(Array.isArray(ce.p) && Array.isArray(ce.q)) );  //only one of p,q can be array
	});
	it('should have positive cross total quantity', function(){
	    assert.ok(crossResult[1]>0);
	});
	it('should have Walrasian and Cross (Marshallian) price within +/-1',
	   function(){
	       assert.ok(Math.abs(wPrice-crossResult[0])<=1);
	   });
	it('should have  crossPrice within ce price from single unit calculation', function(){
	    if (typeof(ce.p)==='number'){
		crossResult[0].should.equal(ce.p);
	    } else if(Array.isArray(ce.p)){
		crossResult[0].should.be.within(ce.p[0],ce.p[1]);
	    }
	});
	it('should have cross quantity equal upper limit of ce quantity', function(){
	    if (Array.isArray(ce.q)){
		crossResult[1].should.equal(ce.q[1]);
	    } else {
		crossResult[1].should.equal(ce.q);
	    }
	});
	it('should have cross total quantity equal sum of buy quantities',
	   function(){
	       var totalQ = crossResult[1];
	       var bqsum = crossResult[2].reduce(
		   function(pv,cv){return pv+cv;},
		   0);
	       assert.ok(bqsum===totalQ);
	   });
	it('should have cross total quantity equal sum of sell quantities',
	   function(){
	       var totalQ = crossResult[1];
	       var sqsum = crossResult[3].reduce(
		   function(pv,cv){ return pv+cv; },
		   0);
	       assert.ok(sqsum===totalQ);
	   });
	it('should have cross order buy quantity equal order quantity except possibly for final item', function(){
	    var buyQ = crossResult[2];
	    var i,l;
	    for(i=0,l=buyQ.length-1;i<l;++i)
		assert.ok(buyQ[i]===buyQueue[i][1]);
	    assert.ok(buyQ[l]<=buyQueue[l][1]);
	});
	it('should have cross order sell quantity equal order quantity except possibly for final item', function(){
	    var sellQ = crossResult[3];
	    var i,l;
	    for(i=0,l=sellQ.length-1;i<l;++i)
		assert.ok(sellQ[i]===sellQueue[i][1]);
	    assert.ok(sellQ[l]<=sellQueue[l][1]);
	});
    });
});
