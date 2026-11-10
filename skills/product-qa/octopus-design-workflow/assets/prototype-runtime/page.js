/* HTML authors edit page composition and fixtures; the renderer is built from Admin. */
const {ref,computed,nextTick}=OctopusPrototype.Vue;
const F=PrototypeFixtures;
OctopusPrototype.mount({setup(){
  const titles={orders:'零售订单',waves:'波次管理',templates:'波次模板'};
  const readPage=()=>Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'waves';
  const page=ref(readPage());
  const navigate=value=>{page.value=value;location.hash=value;};
  addEventListener('hashchange',()=>{page.value=readPage();});
  const icons=OctopusPrototype.ElementPlusIconsVue;
  const slots={orderno:'cell-orderNo',waveno:'cell-waveNo',statuslabel:'cell-statusLabel',templatecode:'cell-templateCode'};
  const {ElMessage,ElMessageBox}=OctopusPrototype.ElementPlus;
  const unavailable=name=>ElMessage.info(`当前案例未接入${name}，未执行业务操作`);
  const orderTable=ref(),waveTable=ref(),templateTable=ref(),templateEdit=ref(),waveDetail=ref();
  const selectedOrders=ref([]),orderTab=ref('open'),orderVisible=ref(false),orderSummary=ref();
  const marketingTypes={'普通售卖':'success','积分兑换':'warning','福袋奖品':'info','签到奖品':'info'};
  const options=values=>values.map(value=>({label:value,value}));
  const orderColumns=[
    {dataIndex:'orderTime',title:'订单时间',hideInTable:true,search:{control:'daterange-group',group:[{key:'createdRange',label:'下单时间',rangeParamKeys:['createdStart','createdEnd']}]}},
    {dataIndex:'orderNo',title:'订单号',minWidth:210,search:{control:'input',placeholder:'请输入订单号'}},
    {dataIndex:'goods',title:'商品信息',minWidth:235,align:'left',search:{control:'input',placeholder:'请输入商品名称'}},
    {dataIndex:'quantity',title:'总件数',width:90,align:'right'},
    {dataIndex:'buyer',title:'买家信息',minWidth:240,align:'left'},
    {dataIndex:'delivery',title:'履约方式',width:100,search:{control:'select',options:options(['自提','快递'])}},
    {dataIndex:'status',title:'订单状态',width:110,search:{control:'select',multiple:true,options:options(['待支付','待接单','待发货','待收货','待提货','已完成','已取消'])}},
    {dataIndex:'store',title:'下单门店',minWidth:180,search:{control:'select',options:options(['演示门店'])}},
    {dataIndex:'channel',title:'支付渠道',width:100,search:{control:'select',options:options(['微信','支付宝'])}},
    {dataIndex:'marketing',title:'营销类型',minWidth:120,search:{control:'select',options:options(Object.keys(marketingTypes))}},
    {dataIndex:'scene',title:'订单场景',width:100,search:{control:'select',options:options(['商城','直播'])}},
    ...[['totalAmount','应付金额'],['discountAmount','优惠金额'],['couponAmount','优惠券'],['points','使用积分'],['pointsAmount','积分抵扣金额'],['paidAmount','实付金额']].map(([dataIndex,title])=>({dataIndex,title,minWidth:125,align:'right',formatter:row=>row[dataIndex]===undefined?'':dataIndex==='points'?String(row[dataIndex]):new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'}).format(row[dataIndex])})),
    {dataIndex:'createdAt',title:'下单时间',minWidth:170},
    {dataIndex:'paymentNo',title:'支付流水',minWidth:230},
  ];
  // This filter implements fixture browsing only; backend matching semantics are not claimed.
  const paginate=(rows,p)=>({list:rows.slice(((p.pageNum||1)-1)*(p.pageSize||20),(p.pageNum||1)*(p.pageSize||20)),total:rows.length});
  const matches=(row,p,keys)=>keys.every(key=>p[key]===undefined||p[key]===null||p[key]===''||(Array.isArray(p[key])?(!p[key].length||p[key].includes(row[key])):String(row[key]??'').includes(String(p[key]))));
  const filteredOrders=ref(F.orders);
  const requestOrders=async p=>{filteredOrders.value=F.orders.filter(r=>orderTab.value==='open'&&matches(r,p,['orderNo','goods','delivery','status','store','channel','marketing','scene'])&&(!p.createdStart||r.createdAt.slice(0,10)>=p.createdStart)&&(!p.createdEnd||r.createdAt.slice(0,10)<=p.createdEnd));return paginate(filteredOrders.value,p);};
  const orderSummaryFields=[['orderNo','订单号'],['status','订单状态'],['goods','商品信息'],['quantity','总件数'],['delivery','履约方式'],['store','下单门店'],['nickname','买家昵称'],['receiver','收货人'],['phone','收货电话']].map(([field,label])=>({field,label,disabled:true}));
  const showOrder=async row=>{orderVisible.value=true;await nextTick();orderSummary.value?.setValues(row);};
  const orderActions=[{label:'查看',onClick:showOrder},{label:'更多',children:['申请售后','取消订单','上传快递单'].map(label=>({label,onClick:()=>unavailable(label)}))}];
  const exportOrders=async()=>{const rows=selectedOrders.value.length?selectedOrders.value:filteredOrders.value;if(!rows.length){ElMessage.info('没有可导出的演示订单');return;}const cols=['orderNo','goods','quantity','status'];const csv='\uFEFF'+[['订单号','商品信息','总件数','订单状态'],...rows.map(r=>cols.map(c=>r[c]))].map(a=>a.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='订单演示样本.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const yesNo=[{label:'是',value:1},{label:'否',value:0}];
  const waveColumns=[
    {dataIndex:'waveNo',title:'波次单号',minWidth:200,search:{control:'input',placeholder:'请输入波次单号'}},
    {dataIndex:'waveType',title:'波次类型',hideInTable:true,search:{control:'select',options:[{label:'销售出库',value:'SALE'}]}},
    {dataIndex:'waveBuType',title:'波次业务类型',hideInTable:true,search:{control:'select',options:[{label:'零售订单',value:'RETAIL'}]}},
    {dataIndex:'waveStatus',title:'波次状态',hideInTable:true,search:{control:'select',options:[{label:'分配完成',value:'ALLOCATED'}]}},
    {dataIndex:'warehouseName',title:'仓库',minWidth:120},
    {dataIndex:'companyName',title:'货主',minWidth:120},
    {dataIndex:'waveTypeLabel',title:'波次类型',minWidth:100},
    {dataIndex:'waveBizTypeLabel',title:'波次业务类型',minWidth:120},
    {dataIndex:'statusLabel',title:'波次状态',width:100},
    {dataIndex:'replenishingFlag',title:'是否补货中',minWidth:110,search:{control:'select',options:yesNo},formatter:row=>row.replenishingFlag?'是':'否'},
    {dataIndex:'fullAllocFlag',title:'是否全量分配',minWidth:120,search:{control:'select',options:yesNo},formatter:row=>row.fullAllocFlag?'是':'否'},
    {dataIndex:'waveTemplateName',title:'波次模板',minWidth:130},
    {dataIndex:'waveFlowTypeLabel',title:'波次流程',minWidth:120},
    {dataIndex:'remark',title:'备注',minWidth:140},
    {dataIndex:'createdAt',title:'创建时间',minWidth:200},
    {dataIndex:'createdByName',title:'创建人',minWidth:90},
    {dataIndex:'updatedAt',title:'更新时间',minWidth:200},
    {dataIndex:'updatedByName',title:'更新人',minWidth:90},
  ];
  const requestWaves=async p=>paginate(F.waves.filter(r=>matches(r,p,['waveNo','waveType','waveBuType','waveStatus','replenishingFlag','fullAllocFlag'])),p);
  const waveActions=[{label:'分配记录',onClick:()=>unavailable('分配记录')}];
  const templateColumns=[
    {dataIndex:'templateCode',title:'波次模板编码',minWidth:150,search:{control:'input',placeholder:'请输入模板编码'}},
    {dataIndex:'templateName',title:'波次模板名称',minWidth:140,search:{control:'input',placeholder:'请输入模板名称'}},
    {dataIndex:'warehouseName',title:'仓库',minWidth:120},
    {dataIndex:'flowType',title:'流程类型',minWidth:160,search:{control:'select',options:F.flowOptions.map(o=>({value:o.flowType,label:o.flowTypeLabel}))},formatter:row=>row.flowTypeLabel??''},
    {dataIndex:'orderType',title:'出库类型',minWidth:100,search:{control:'select',options:[{value:'SALE',label:'销售出库'}]},formatter:row=>row.orderTypeLabel??''},
    {dataIndex:'orderBuType',title:'出库业务类型',minWidth:110,search:{control:'select',options:[{value:'RETAIL',label:'零售订单'}]},formatter:row=>row.orderBuTypeLabel??''},
    {dataIndex:'enabled',title:'是否启用',width:90,search:{control:'select',options:[{label:'启用',value:1},{label:'停用',value:0}]}},
  ];
  const requestTemplates=async p=>paginate(F.templates.filter(r=>matches(r,p,['templateCode','templateName','flowType','orderType','orderBuType','enabled'])),p);
  const deleteTemplate=async row=>{try{await ElMessageBox.confirm(`确认删除演示模板「${row.templateName}」？刷新页面即可还原。`,'原型预览',{type:'warning'});}catch{return;}F.templates.splice(F.templates.findIndex(r=>r.id===row.id),1);templateTable.value?.fetchData();};
  return {slots,page,titles,navigate,icons,unavailable,orderTable,waveTable,templateTable,templateEdit,waveDetail,orderColumns,requestOrders,orderTab,selectedOrders,marketingTypes,orderActions,showOrder,orderVisible,orderSummary,orderSummaryFields,exportOrders,waveColumns,requestWaves,waveActions,templateColumns,requestTemplates,deleteTemplate};
}},'#app',{services:F.services,warehouse:F.warehouse,permissions:[],layoutDensity:'default'});
