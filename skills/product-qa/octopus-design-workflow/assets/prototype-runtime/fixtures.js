/* Synthetic fixtures only; never an API specification or a copy of customer data. */
const PrototypeFixtures = (() => {
  const warehouse={warehouseId:'demo-warehouse',warehouseCode:'DEMO-WH',warehouseName:'演示仓库'};
  const flowOptions=[{id:'flow-one',flowType:'ONE_CLICK',flowTypeLabel:'一键出库'}, {id:'flow-pick',flowType:'PICK',flowTypeLabel:'摘果'}, {id:'flow-seed',flowType:'SEED',flowTypeLabel:'播种'}];
  const templates=[{id:'template-1',...warehouse,templateCode:'DEMO-XSCK',templateName:'销售出库',waveFlowId:'flow-one',flowType:'ONE_CLICK',flowTypeLabel:'一键出库',orderType:'SALE',orderTypeLabel:'销售出库',orderBuType:'RETAIL',orderBuTypeLabel:'零售订单',enabled:1,groupByOwner:1,shortAllocFlag:0,hiddenFlag:0,reviewFlag:0,allowNegativeInvFlag:0,maxOrderQty:100,minOrderQty:1}];
  const waves=[1,2,3].map((n)=>({id:'wave-'+n,...warehouse,waveNo:'DEMO-WV-00'+n,companyId:'demo-owner',companyName:'演示货主',waveType:'SALE',waveTypeLabel:'销售出库',waveTypeName:'销售出库',waveBuType:'RETAIL',waveBizTypeLabel:'零售订单',waveBuTypeName:'零售订单',waveStatus:'ALLOCATED',statusLabel:'分配完成',waveStatusName:'分配完成',waveTemplateName:'销售出库',waveFlowTypeLabel:'一键出库',replenishingFlag:0,fullAllocFlag:n===2?0:1,remark:n===2?'数量差异展示样本':'',createdAt:'2026-10-28 09:00:00',createdByName:'演示用户',updatedAt:'2026-10-28 09:10:00',updatedByName:'演示用户'}));
  const items=Object.fromEntries(waves.map((w,i)=>[w.id,i===2?[]:[1,2,3].map((n)=>({__key:w.id+'-'+n,outboundNo:'DEMO-OB-00'+n,destHubName:'演示站点',skuImage:{url:SAMPLE_PRODUCT_IMAGE},skuCode:'DEMO-SKU-001',skuName:'新人1元福利小笼包',specName:'200g一袋 6个装',uomLabel:'袋',planQty:10*n,plannedQty:10*n,allocatedQty:i===1&&n===2?10:10*n,canceledQty:0,replenishing:i===1&&n===2}))]));
  const orders=Array.from({length:9},(_,i)=>({fixtureId:'order-'+i,orderNo:'DEMO-ORD-00'+(i+1),goods:'新人1元福利小笼包',spec:'200g一袋 6个装',image:SAMPLE_PRODUCT_IMAGE,quantity:i%2?1:2,nickname:'演示买家',receiver:'演示收货人',phone:'138****0000',delivery:'快递',status:'待发货',statusType:'warning',store:'演示门店',channel:i%3===0?'支付宝':'微信',marketing:['普通售卖','福袋奖品','积分兑换','签到奖品'][i%4],scene:i%3===0?'商城':'直播',totalAmount:i%2?1:2,discountAmount:0,couponAmount:0,points:0,pointsAmount:0,paidAmount:i%2?1:2,createdAt:'2026-09-14 17:11:00',paymentNo:'DEMO-PAY-00'+(i+1)}));
  const copy=x=>JSON.parse(JSON.stringify(x));
  const getTemplate=id=>{const r=templates.find(t=>t.id===String(id));if(!r)throw new Error('演示模板不存在');return r;};
  const services={
    policyManagement:{
      getWaveFlowOptions:async()=>({data:{list:copy(flowOptions)}}),
      getWaveTemplateSchedulerOptions:async()=>({data:[{cronExpression:'0 0/30 * * * ?',jobName:'demo-half-hour',description:'每 30 分钟（演示）'}]}),
      getWaveTemplateDetail:async(id)=>({data:copy(getTemplate(id))}),
      doCreateWaveTemplate:async(data)=>{const row={...copy(data),id:'template-'+(templates.length+1),...warehouse};decorate(row);templates.push(row);return {data:copy(row)};},
      doUpdateWaveTemplate:async(data)=>{const row=getTemplate(data.id);Object.assign(row,copy(data));decorate(row);return {data:copy(row)};},
    },
    dictManagement:{getDictItemsByKeyWithFallback:async(key)=>({data:key==='outbound_type'?[{code:'SALE',label:'销售出库'}]:key==='outbound_biz_type'?[{code:'RETAIL',label:'零售订单'}]:[]})},
    outboundWave:{getDetail:async({waveId})=>({data:copy(waves.find(w=>w.id===waveId))}),getItemList:async({waveId})=>({data:{list:copy(items[waveId])}})},
    remoteSelectPresets:{getWarehouseOptions:async()=>({data:{list:[{id:warehouse.warehouseId,...warehouse}],total:1}})},
  };
  function decorate(row){row.flowTypeLabel=flowOptions.find(o=>o.id===row.waveFlowId)?.flowTypeLabel;row.orderTypeLabel='销售出库';row.orderBuTypeLabel='零售订单';}
  return {warehouse,flowOptions,templates,waves,orders,services};
})();
