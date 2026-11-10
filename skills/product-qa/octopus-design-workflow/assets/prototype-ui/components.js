/* Octopus prototype UI. Contract: docs/standards/prototype-components.md.
   Vue + Element Plus primitives; no order data, permissions, requests or business state. */
const OctopusPrototypeUI = {
  install(app) {
    app.component('OctoQueryGroup', {
      props: { dimension: String, options: {type:Array,default:()=>[]}, prefixLabel: String, disabled:Boolean },
      emits:['update:dimension'],
      template:`<div class="octo-query-group" :class="{'is-disabled':disabled}">
        <el-select class="octo-query-group__prefix" :model-value="dimension" :aria-label="prefixLabel" :disabled="disabled" size="default" @update:model-value="$emit('update:dimension',$event)">
          <el-option v-for="option in options" :key="option" :label="option" :value="option" />
        </el-select><slot />
      </div>`
    });
    app.component('OctoTableActions', {
      props:{actions:{type:Array,default:()=>[]}}, emits:['action'],
      computed:{ primary(){return this.actions.length>2?this.actions.slice(0,1):this.actions;}, overflow(){return this.actions.length>2?this.actions.slice(1):[];} },
      template:`<div class="octo-table-actions">
        <el-button v-for="action in primary" :key="action.key" text size="default" :type="action.type||'primary'" :disabled="action.disabled" @click="$emit('action',action.key)">{{action.label}}</el-button>
        <el-dropdown v-if="overflow.length" size="default" trigger="click" @command="$emit('action',$event)">
          <el-button text size="default" type="info" @click.stop>更多<el-icon class="el-icon--right"><arrow-down /></el-icon></el-button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="action in overflow" :key="action.key" :command="action.key" :disabled="action.disabled" :class="{'octo-action--danger':action.type==='danger'}">{{action.label}}</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </div>`
    });
  }
};
