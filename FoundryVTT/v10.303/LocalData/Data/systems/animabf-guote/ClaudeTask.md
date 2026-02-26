I prefer to change the incarnations. Lets give them these          
  stats: Level, name (including affinity level), difficulty,         
  summon bonus value (0 by default, editable by the user),           
  turno, HA, HD, Proyección, Equipment, Active options, and          
  Pasive skills.                                                     
  With this, the impor from text wont work, but i prefer this.       
  For now its ok if this incarnation is just descriptive. In the     
   character sheet, we should see the name of the incarnation,       
  difficulty, and summon bonus value.                                
  I think I will use Dynamic Active Effects for these                
  incarnations, so taht if they are active, the characters           
  attributes (turno, HA, HD, proyección) becomes the highest of      
  their own stat and the incarnation stat. Or can We do this         
  directly, natively, adding a toggle/checkbox to mark if some       
  incarnation is active?                                             

● Yes, we can absolutely do this natively — it's cleaner than Dynamic
   Active Effects for this case. Here's the approach:
                                                                       Incarnation item becomes flat: one item per affinity tier (e.g.
  "Linx - Menor", "Linx - Intermedia"). Each has: level, difficulty, 
  summonBonus, turno, ha, hd, projection, equipment (textarea),
  activeOptions (textarea), passiveSkills (textarea), and an active
  boolean.

  Character sheet shows: name, difficulty, summonBonus, and an active
   toggle checkbox.

  Native active logic: In the prepareActor derived data pipeline, we 
  check for any active incarnation and apply max(own, incarnation)   
  for turno, HA, HD, and projection. No Active Effects needed.       

  This also means we can drop the import macro entirely.                                                         
● User answered Claude's questions:                                  
  ⎿  · Which projection stat should the incarnation override? 
     Magic Projection (Proy. Mágica) or both magic and psychic? →          Add both fields, instead of a single proyección for the 
     incarnations                                                    
     · Should only ONE incarnation be active at a time (toggling 
     one disables others), or can multiple be active                      simultaneously? → One at a time (Recommended)                                                                                                                                                             ● Got it — two separate projection fields, and only one incarnation    active at a time. Let me redesign everything.                      
                                                                     ● Task 10: Redesign incarnation schema                               
                                                                     
● Read 1 file (ctrl+o to expand)                                     
                                                                     
● Update(template.json)                                                ⎿  Added 12 lines, removed 33 lines                                      652        "bonusOther": { "value": "" }                       
      653      },                                                          654      "incarnation": {                                      
      655 -      "description": { "value": "" },                           656 -      "invocationModifiers": { "value": "" },      
      657 -      "genericPowers": { "value": "" },                         658 -      "timeModifiers": { "value": "" },
      659 -      "affinities": {                                           660 -        "menor": {                                              661 -          "level": { "value": 0 },                              662 -          "difficulty": { "value": 0 },                         663 -          "zeonCost": { "value": 0 },                           664 -          "ha": { "value": 0 },                           
      665 -          "hd": { "value": 0 },
      666 -          "turno": { "value": 0 },                        
      667 -          "content": { "value": "" }                      
      668 -        },                                                
      669 -        "intermedia": {                                   
      670 -          "level": { "value": 0 },                        
      671 -          "difficulty": { "value": 0 },                   
      672 -          "zeonCost": { "value": 0 },                     
      673 -          "ha": { "value": 0 },                           
      674 -          "hd": { "value": 0 },                           
      675 -          "turno": { "value": 0 },                        
      676 -          "content": { "value": "" }                      
      677 -        },                                                
      678 -        "real": {                                         
      679 -          "level": { "value": 0 },                        
      680 -          "difficulty": { "value": 0 },                   
      681 -          "zeonCost": { "value": 0 },                     
      682 -          "ha": { "value": 0 },                           
      683 -          "hd": { "value": 0 },                           
      684 -          "turno": { "value": 0 },                        
      685 -          "content": { "value": "" }                      
      686 -        }                                                 
      687 -      }                                                   
      655 +      "level": { "value": 0 },                            
      656 +      "difficulty": { "value": 0 },                       
      657 +      "summonBonus": { "value": 0 },                      
      658 +      "turno": { "value": 0 },                            
      659 +      "ha": { "value": 0 },                               
      660 +      "hd": { "value": 0 },                               
      661 +      "magicProjection": { "value": 0 },                  
      662 +      "psychicProjection": { "value": 0 },                
      663 +      "equipment": { "value": "" },                       
      664 +      "activeOptions": { "value": "" },                   
      665 +      "passiveSkills": { "value": "" },                   
      666 +      "active": { "value": false }                        
      667      }
      668    }
      669  }

● Now update IncarnationItemConfig.js.
    
● Read 1 file (ctrl+o to expand)       
                                                                     
● Write(module\types\mystic\IncarnationItemConfig.js)                
  ⎿  Added 39 lines, removed 60 lines                        
       1 -import { ABFItems } from '../../items/ABFItems.js';               2 -import { ABFItemConfigFactory } from                       
         -'../ABFItemConfig.js';                                            3 -                                                                  4 -export const INITIAL_INCARNATION_DATA = {                  
       5 -    description: { value: '' },                            
       6 -    invocationModifiers: { value: '' },                       7 -    genericPowers: { value: '' },                                 8 -    timeModifiers: { value: '' },                          
       9 -    affinities: {
      10 -        menor: {                                           
      11 -            level: { value: 0 },                           
      12 -            difficulty: { value: 0 },                      
      13 -            zeonCost: { value: 0 },                        
      14 -            ha: { value: 0 },                              
      15 -            hd: { value: 0 },                              
      16 -            turno: { value: 0 },                           
      17 -            content: { value: '' }                         
      18 -        },                                                 
      19 -        intermedia: {                                      
      20 -            level: { value: 0 },                           
      21 -            difficulty: { value: 0 },                      
      22 -            zeonCost: { value: 0 },                        
      23 -            ha: { value: 0 },                              
      24 -            hd: { value: 0 },                              
      25 -            turno: { value: 0 },                           
      26 -            content: { value: '' }                         
      27 -        },                                                 
      28 -        real: {                                            
      29 -            level: { value: 0 },                           
      30 -            difficulty: { value: 0 },                      
      31 -            zeonCost: { value: 0 },                        
      32 -            ha: { value: 0 },                              
      33 -            hd: { value: 0 },                              
      34 -            turno: { value: 0 },                           
      35 -            content: { value: '' }                         
      36 -        }                                                  
      37 -    }                                                      
      38 -};                                                         
      39 -                                                           
      40 -export const IncarnationItemConfig =                       
         -ABFItemConfigFactory({                                     
      41 -    type: ABFItems.INCARNATION,                            
      42 -    isInternal: false,                                     
      43 -    hasSheet: true,                                        
      44 -    defaultValue: INITIAL_INCARNATION_DATA,                
      45 -    fieldPath: ['mystic', 'incarnations'],                 
      46 -    selectors: {                                           
      47 -        addItemButtonSelector: 'add-incarnation',          
      48 -        containerSelector:                                 
         -'#incarnations-context-menu-container',                    
      49 -        rowSelector: '.incarnation-row'                    
      50 -    },                                                     
      51 -    onCreate: async (actor) => {                           
      52 -        const { i18n } = game;                             
      53 -        const itemData = {                                 
      54 -            name:                                          
         -i18n.localize('anima.ui.mystic.incarnation.new'),          
      55 -            type: ABFItems.INCARNATION,                    
      56 -            system: INITIAL_INCARNATION_DATA               
      57 -        };                                                 
      58 -        await actor.createItem(itemData);                  
      59 -    }                                                      
      60 -});                                                        
       1 +import { ABFItems } from '../../items/ABFItems.js';        
       2 +import { ABFItemConfigFactory } from                       
         +'../ABFItemConfig.js';                                     
       3 +                                                           
       4 +export const INITIAL_INCARNATION_DATA = {                  
       5 +    level: { value: 0 },                                   
       6 +    difficulty: { value: 0 },        
       7 +    summonBonus: { value: 0 },                             
       8 +    turno: { value: 0 },                                   
       9 +    ha: { value: 0 },                                      
      10 +    hd: { value: 0 },                                      
      11 +    magicProjection: { value: 0 },                         
      12 +    psychicProjection: { value: 0 },                       
      13 +    equipment: { value: '' },                              
      14 +    activeOptions: { value: '' },                          
      15 +    passiveSkills: { value: '' },                          
      16 +    active: { value: false }                               
      17 +};                                                         
      18 +                                                           
      19 +export const IncarnationItemConfig =                       
         +ABFItemConfigFactory({                                     
      20 +    type: ABFItems.INCARNATION,                            
      21 +    isInternal: false,                                     
      22 +    hasSheet: true,                                        
      23 +    defaultValue: INITIAL_INCARNATION_DATA,                
      24 +    fieldPath: ['mystic', 'incarnations'],                 
      25 +    selectors: {                                           
      26 +        addItemButtonSelector: 'add-incarnation',          
      27 +        containerSelector:                                 
         +'#incarnations-context-menu-container',                    
      28 +        rowSelector: '.incarnation-row'                    
      29 +    },                                                     
      30 +    onCreate: async (actor) => {                           
      31 +        const { i18n } = game;                             
      32 +        const itemData = {                                 
      33 +            name:                                          
         +i18n.localize('anima.ui.mystic.incarnation.new'),          
      34 +            type: ABFItems.INCARNATION,                    
      35 +            system: INITIAL_INCARNATION_DATA               
      36 +        };                                                 
      37 +        await actor.createItem(itemData);                  
      38 +    }                                                      
      39 +});                                                        

● Task 11: Redesign incarnation item sheet                  
                                                                     
● Write(templates\items\incarnation\incarnation.hbs)       
  ⎿  Added 141 lines, removed 166 lines                      
        1 -<form class="incarnation-sheet flexcol"                             -autocomplete="off">                                       
        2 -  <style>                                                 
        3 -    .incarnation-sheet {                                          4 -      font-size: 12px;                                    
        5 -      padding: 6px;                                               6 -      background: #f4f1ea;
        7 -      color: #333;                                        
        8 -    }                                                     
        9 -    .incarnation-sheet .inc-header {
       10 -      display: flex;                                      
       11 -      align-items: center;                                
       12 -      gap: 6px;                                           
       13 -      margin-bottom: 6px;                                 
       14 -      padding-bottom: 4px;                                
       15 -      border-bottom: 2px solid #5a3a7e;                   
       16 -    }                                                     
       17 -    .incarnation-sheet .inc-header img {                  
       18 -      width: 32px;                                        
       19 -      height: 32px;                                       
       20 -      border: 1px solid #5a3a7e;                          
       21 -      border-radius: 3px;                                 
       22 -      cursor: pointer;                                    
       23 -    }                                                     
       24 -    .incarnation-sheet .inc-header input {                
       25 -      flex: 1;                                            
       26 -      font-size: 14px;                                    
       27 -      font-weight: bold;                                  
       28 -      border: none;                                       
       29 -      border-bottom: 1px solid #ccc;                      
       30 -      background: transparent;                            
       31 -      padding: 1px 4px;                                   
       32 -    }                                                     
       33 -    .incarnation-sheet .inc-header input:focus {          
       34 -      border-bottom-color: #5a3a7e;                       
       35 -      outline: none;                                      
       36 -    }                                                     
       37 -    .incarnation-sheet .inc-section {                     
       38 -      margin: 6px 0 2px;                                  
       39 -      font-size: 10px;                                    
       40 -      font-weight: bold;                                  
       41 -      text-transform: uppercase;                          
       42 -      padding: 2px 4px;                                   
       43 -      border-radius: 3px;                                 
       44 -      color: #fff;                                        
       45 -    }                                                     
       46 -    .incarnation-sheet .inc-section--menor {              
          -background: #6b8e23; }                                    
       47 -    .incarnation-sheet .inc-section--intermedia {         
          -background: #cd853f; }                                    
       48 -    .incarnation-sheet .inc-section--real {               
          -background: #8b0000; }                                    
       49 -    .incarnation-sheet .inc-section--info {               
          -background: #5a3a7e; }                                    
       50 -    .incarnation-sheet .inc-row {                         
       51 -      display: flex;                                      
       52 -      gap: 6px;                                           
       53 -      flex-wrap: wrap;                                    
       54 -      align-items: center;                                
       55 -      margin: 3px 0;                                      
       56 -    }                                                     
       57 -    .incarnation-sheet .inc-field {                       
       58 -      display: flex;                                      
       59 -      align-items: center;                                
       60 -      gap: 3px;                                           
       61 -    }                                                     
       62 -    .incarnation-sheet .inc-field b {                     
       63 -      font-size: 10px;                                    
       64 -      color: #666;                                        
       65 -      min-width: 24px;                                    
       66 -    }                                                     
       67 -    .incarnation-sheet input[type="number"] {             
       68 -      width: 48px;                                        
       69 -      text-align: center;                                 
       70 -      border: 1px solid #d4c9a8;
       71 -      border-radius: 3px;                                 
       72 -      padding: 1px 2px;                                   
       73 -      font-size: 12px;                                    
       74 -    }                                                     
       75 -    .incarnation-sheet textarea {                         
       76 -      width: 100%;                                        
       77 -      min-height: 36px;                                   
       78 -      resize: vertical;                                   
       79 -      border: 1px solid #d4c9a8;                          
       80 -      border-radius: 3px;                                 
       81 -      padding: 3px 4px;                                   
       82 -      font-size: 11px;                                    
       83 -      font-family: inherit;                               
       84 -    }                                                     
       85 -    .incarnation-sheet textarea.inc-content {             
       86 -      min-height: 50px;                                   
       87 -    }                                                     
       88 -    .incarnation-sheet input:focus,                       
          -.incarnation-sheet textarea:focus {                       
       89 -      border-color: #5a3a7e;                              
       90 -      outline: none;                                      
       91 -    }                                                     
       92 -    .incarnation-sheet .inc-sep {                         
       93 -      width: 100%;                                        
       94 -      height: 1px;                                        
       95 -      background: #d4c9a8;                                
       96 -      margin: 4px 0;                                      
       97 -    }                                                     
       98 -  </style>                                                
       99 -                                                          
      100 -  <div class="inc-header">                                
      101 -    <img src="{{item.img}}" data-edit="img"               
          -title="{{item.name}}">                                    
      102 -    <input type="text" name="name"                        
          -value="{{item.name}}">                                    
      103 -  </div>                                                  
      104 -                                                          
      105 -  {{!-- Invocation Modifiers --}}                         
      106 -  <div class="inc-section                                 
          -inc-section--info">{{localize "anima.ui.mystic.inc        
          -arnation.invocationModifiers"}}</div>                     
      107 -  <textarea                                               
          -name="system.invocationModifiers.value"                   
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.invocationModifiers'}        
          -}">{{system.invocationModifiers.value}}</textarea>        
      108 -                                                          
      109 -  {{!-- Generic Powers --}}                               
      110 -  <div class="inc-section                                 
          -inc-section--info">{{localize "anima.ui.mystic.inc        
          -arnation.genericPowers"}}</div>                           
      111 -  <textarea name="system.genericPowers.value"             
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.genericPowers'}}">{{s        
          -ystem.genericPowers.value}}</textarea>                    
      112 -                                                          
      113 -  {{!-- Time Modifiers --}}                               
      114 -  <div class="inc-section                                 
          -inc-section--info">{{localize "anima.ui.mystic.inc        
          -arnation.timeModifiers"}}</div>                           
      115 -  <textarea name="system.timeModifiers.value"             
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.timeModifiers'}}">{{s        
          -ystem.timeModifiers.value}}</textarea>                    
      116 -                                                          
      117 -  <div class="inc-sep"></div>                             
      118 -                                                          
      119 -  {{!-- Afinidad Menor --}}                               
      120 -  <div class="inc-section                                 
          -inc-section--menor">{{localize "anima.ui.mystic.in        
          -carnation.affinity.menor"}}</div>                         
      121 -  <div class="inc-row">                                   
      122 -    <div class="inc-field"><b>Niv</b><input               
          -type="number"                                             
          -name="system.affinities.menor.level.value" value="        
          -{{system.affinities.menor.level.value}}"></div>           
      123 -    <div class="inc-field"><b>Dif</b><input               
          -type="number"                                             
          -name="system.affinities.menor.difficulty.value"           
          -value="{{system.affinities.menor.difficulty.value}        
          -}"></div>                                                 
      124 -    <div class="inc-field"><b>Zeón</b><input              
          -type="number"                                             
          -name="system.affinities.menor.zeonCost.value"             
          -value="{{system.affinities.menor.zeonCost.value}}"        
          -></div>                                                   
      125 -  </div>                                                  
      126 -  <div class="inc-row">                                   
      127 -    <div class="inc-field"><b>HA</b><input                
          -type="number"                                             
          -name="system.affinities.menor.ha.value" value="{{s        
          -ystem.affinities.menor.ha.value}}"></div>                 
      128 -    <div class="inc-field"><b>HD</b><input                
          -type="number"                                             
          -name="system.affinities.menor.hd.value" value="{{s        
          -ystem.affinities.menor.hd.value}}"></div>                 
      129 -    <div class="inc-field"><b>Turno</b><input             
          -type="number"                                             
          -name="system.affinities.menor.turno.value" value="        
          -{{system.affinities.menor.turno.value}}"></div>           
      130 -  </div>                                                  
      131 -  <textarea class="inc-content"                           
          -name="system.affinities.menor.content.value"              
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.content'}}">{{system.        
          -affinities.menor.content.value}}</textarea>               
      132 -                                                          
      133 -  {{!-- Afinidad Intermedia --}}                          
      134 -  <div class="inc-section                                 
          -inc-section--intermedia">{{localize "anima.ui.myst        
          -ic.incarnation.affinity.intermedia"}}</div>               
      135 -  <div class="inc-row">                                   
      136 -    <div class="inc-field"><b>Niv</b><input               
          -type="number"                                             
          -name="system.affinities.intermedia.level.value"           
          -value="{{system.affinities.intermedia.level.value}        
          -}"></div>                                                 
      137 -    <div class="inc-field"><b>Dif</b><input               
          -type="number" name="system.affinities.intermedia.d        
          -ifficulty.value" value="{{system.affinities.interm        
          -edia.difficulty.value}}"></div>                           
      138 -    <div class="inc-field"><b>Zeón</b><input              
          -type="number"                                             
          -name="system.affinities.intermedia.zeonCost.value"        
          - value="{{system.affinities.intermedia.zeonCost.va        
          -lue}}"></div>                                             
      139 -  </div>                                                  
      140 -  <div class="inc-row">                                   
      141 -    <div class="inc-field"><b>HA</b><input                
          -type="number"                                             
          -name="system.affinities.intermedia.ha.value"              
          -value="{{system.affinities.intermedia.ha.value}}">        
          -</div>                                                    
      142 -    <div class="inc-field"><b>HD</b><input                
          -type="number"                                             
          -name="system.affinities.intermedia.hd.value"              
          -value="{{system.affinities.intermedia.hd.value}}">        
          -</div>                                                    
      143 -    <div class="inc-field"><b>Turno</b><input             
          -type="number"                                             
          -name="system.affinities.intermedia.turno.value"           
          -value="{{system.affinities.intermedia.turno.value}        
          -}"></div>                                                 
      144 -  </div>                                                  
      145 -  <textarea class="inc-content"                           
          -name="system.affinities.intermedia.content.value"         
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.content'}}">{{system.        
          -affinities.intermedia.content.value}}</textarea>          
      146 -                                                          
      147 -  {{!-- Afinidad Real --}}                                
      148 -  <div class="inc-section                                 
          -inc-section--real">{{localize "anima.ui.mystic.inc        
          -arnation.affinity.real"}}</div>                           
      149 -  <div class="inc-row">                                   
      150 -    <div class="inc-field"><b>Niv</b><input               
          -type="number"                                             
          -name="system.affinities.real.level.value" value="{        
          -{system.affinities.real.level.value}}"></div>             
      151 -    <div class="inc-field"><b>Dif</b><input               
          -type="number"                                             
          -name="system.affinities.real.difficulty.value"            
          -value="{{system.affinities.real.difficulty.value}}        
          -"></div>                                                  
      152 -    <div class="inc-field"><b>Zeón</b><input              
          -type="number"                                             
          -name="system.affinities.real.zeonCost.value"              
          -value="{{system.affinities.real.zeonCost.value}}">        
          -</div>                                                    
      153 -  </div>                                                  
      154 -  <div class="inc-row">                                   
      155 -    <div class="inc-field"><b>HA</b><input                
          -type="number"                                             
          -name="system.affinities.real.ha.value"                    
          -value="{{system.affinities.real.ha.value}}"></div>        
      156 -    <div class="inc-field"><b>HD</b><input                
          -type="number"                                             
          -name="system.affinities.real.hd.value"                    
          -value="{{system.affinities.real.hd.value}}"></div>        
      157 -    <div class="inc-field"><b>Turno</b><input             
          -type="number"                                             
          -name="system.affinities.real.turno.value" value="{        
          -{system.affinities.real.turno.value}}"></div>             
      158 -  </div>                                                  
      159 -  <textarea class="inc-content"                           
          -name="system.affinities.real.content.value"               
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.content'}}">{{system.        
          -affinities.real.content.value}}</textarea>                
      160 -                                                          
      161 -  <div class="inc-sep"></div>                             
      162 -                                                          
      163 -  {{!-- Description --}}                                  
      164 -  <div class="inc-section                                 
          -inc-section--info">{{localize                             
          -"anima.ui.mystic.incarnation.description"}}</div>         
      165 -  <textarea name="system.description.value"               
          -placeholder="{{localize                                   
          -'anima.ui.mystic.incarnation.description'}}">{{sys        
          -tem.description.value}}</textarea>                        
      166 -</form>                                                   
        1 +<form class="incarnation-sheet flexcol"                   
          +autocomplete="off">                                       
        2 +  <style>                                                 
        3 +    .incarnation-sheet {                                  
        4 +      font-size: 12px;                                    
        5 +      padding: 6px;                                       
        6 +      background: #f4f1ea;                                
        7 +      color: #333;                                        
        8 +    }                                                     
        9 +    .incarnation-sheet .inc-header {                      
       10 +      display: flex;                                      
       11 +      align-items: center;                                
       12 +      gap: 6px;                                           
       13 +      margin-bottom: 6px;                                 
       14 +      padding-bottom: 4px;                                
       15 +      border-bottom: 2px solid #5a3a7e;                   
       16 +    }                                                     
       17 +    .incarnation-sheet .inc-header img {                  
       18 +      width: 32px;                                        
       19 +      height: 32px;                                       
       20 +      border: 1px solid #5a3a7e;                          
       21 +      border-radius: 3px;                                 
       22 +      cursor: pointer;                                    
       23 +    }                                                     
       24 +    .incarnation-sheet .inc-header input                  
          +[type="text"] {                                           
       25 +      flex: 1;                                            
       26 +      font-size: 14px;                                    
       27 +      font-weight: bold;                                  
       28 +      border: none;                                       
       29 +      border-bottom: 1px solid #ccc;                      
       30 +      background: transparent;                            
       31 +      padding: 1px 4px;                                   
       32 +    }                                                     
       33 +    .incarnation-sheet .inc-header input                  
          +[type="text"]:focus {                                     
       34 +      border-bottom-color: #5a3a7e;                       
       35 +      outline: none;                                      
       36 +    }                                                     
       37 +    .incarnation-sheet .inc-section {                     
       38 +      margin: 6px 0 2px;                                  
       39 +      font-size: 10px;                                    
       40 +      font-weight: bold;                                  
       41 +      text-transform: uppercase;                          
       42 +      padding: 2px 4px;                                   
       43 +      border-radius: 3px;                                 
       44 +      color: #fff;                                        
       45 +      background: #5a3a7e;                                
       46 +    }                                                     
       47 +    .incarnation-sheet .inc-row {                         
       48 +      display: flex;                                      
       49 +      gap: 6px;                                           
       50 +      flex-wrap: wrap;                                    
       51 +      align-items: center;                                
       52 +      margin: 3px 0;                                      
       53 +    }                                                     
       54 +    .incarnation-sheet .inc-field {                       
       55 +      display: flex;                                      
       56 +      align-items: center;                                
       57 +      gap: 3px;                                           
       58 +    }                                                     
       59 +    .incarnation-sheet .inc-field b {                     
       60 +      font-size: 10px;                                    
       61 +      color: #666;                                        
       62 +      min-width: 24px;                                    
       63 +    }                                                     
       64 +    .incarnation-sheet input[type="number"] {             
       65 +      width: 48px;                                        
       66 +      text-align: center;                                 
       67 +      border: 1px solid #d4c9a8;                          
       68 +      border-radius: 3px;                                 
       69 +      padding: 1px 2px;                                   
       70 +      font-size: 12px;                                    
       71 +    }                                                     
       72 +    .incarnation-sheet textarea {                         
       73 +      width: 100%;                                        
       74 +      min-height: 50px;                                   
       75 +      resize: vertical;                                   
       76 +      border: 1px solid #d4c9a8;                          
       77 +      border-radius: 3px;                                 
       78 +      padding: 3px 4px;                                   
       79 +      font-size: 11px;                                    
       80 +      font-family: inherit;                               
       81 +    }                                                     
       82 +    .incarnation-sheet input:focus,                       
          +.incarnation-sheet textarea:focus {                       
       83 +      border-color: #5a3a7e;                              
       84 +      outline: none;                                      
       85 +    }                                                     
       86 +    .incarnation-sheet .inc-sep {                         
       87 +      width: 100%;                                        
       88 +      height: 1px;                                        
       89 +      background: #d4c9a8;                                
       90 +      margin: 4px 0;                                      
       91 +    }                                                     
       92 +    .incarnation-sheet .inc-active-label {                
       93 +      display: flex;                                      
       94 +      align-items: center;                                
       95 +      gap: 4px;                                           
       96 +      font-size: 11px;                                    
       97 +      font-weight: bold;                                  
       98 +      color: #5a3a7e;                                     
       99 +    }                                                     
      100 +  </style>                                                
      101 +                                                          
      102 +  <div class="inc-header">                                
      103 +    <img src="{{item.img}}" data-edit="img"               
          +title="{{item.name}}">                                    
      104 +    <input type="text" name="name"                        
          +value="{{item.name}}">                                    
      105 +    <label class="inc-active-label">                      
      106 +      <input type="checkbox"                              
          +name="system.active.value" {{#if                          
          +system.active.value}}checked{{/if}}>                      
      107 +      {{localize                                          
          +"anima.ui.mystic.incarnation.active"}}                    
      108 +    </label>                                              
      109 +  </div>                                                  
      110 +                                                          
      111 +  {{!-- Core Stats --}}                                   
      112 +  <div class="inc-section">{{localize                     
          +"anima.ui.tabs.combat"}}</div>                            
      113 +  <div class="inc-row">                                   
      114 +    <div class="inc-field"><b>Niv</b><input               
          +type="number" name="system.level.value"                   
          +value="{{system.level.value}}"></div>                     
      115 +    <div class="inc-field"><b>Dif</b><input               
          +type="number" name="system.difficulty.value"              
          +value="{{system.difficulty.value}}"></div>                
      116 +    <div class="inc-field"><b>{{localize "anima.ui        
          +.mystic.incarnation.summonBonus.short"}}</b><input        
          + type="number" name="system.summonBonus.value"            
          +value="{{system.summonBonus.value}}"></div>               
      117 +  </div>                                                  
      118 +  <div class="inc-row">                                   
      119 +    <div class="inc-field"><b>Turno</b><input             
          +type="number" name="system.turno.value"                   
          +value="{{system.turno.value}}"></div>                     
      120 +    <div class="inc-field"><b>HA</b><input                
          +type="number" name="system.ha.value"                      
          +value="{{system.ha.value}}"></div>                        
      121 +    <div class="inc-field"><b>HD</b><input                
          +type="number" name="system.hd.value"                      
          +value="{{system.hd.value}}"></div>                        
      122 +  </div>                                                  
      123 +  <div class="inc-row">                                   
      124 +    <div class="inc-field"><b>{{localize                  
          +"anima.ui.mystic.incarnation.magicProjection.short        
          +"}}</b><input type="number"                               
          +name="system.magicProjection.value"                       
          +value="{{system.magicProjection.value}}"></div>           
      125 +    <div class="inc-field"><b>{{localize                  
          +"anima.ui.mystic.incarnation.psychicProjection.sho        
          +rt"}}</b><input type="number"                             
          +name="system.psychicProjection.value"                     
          +value="{{system.psychicProjection.value}}"></div>         
      126 +  </div>                                                  
      127 +                                                          
      128 +  <div class="inc-sep"></div>                             
      129 +                                                          
      130 +  {{!-- Equipment --}}                                    
      131 +  <div class="inc-section">{{localize                     
          +"anima.ui.mystic.incarnation.equipment"}}</div>           
      132 +  <textarea name="system.equipment.value"                 
          +placeholder="{{localize                                   
          +'anima.ui.mystic.incarnation.equipment'}}">{{syste        
          +m.equipment.value}}</textarea>                            
      133 +                                                          
      134 +  {{!-- Active Options --}}                               
      135 +  <div class="inc-section">{{localize "anima.ui.my        
          +stic.incarnation.activeOptions"}}</div>                   
      136 +  <textarea name="system.activeOptions.value"             
          +placeholder="{{localize                                   
          +'anima.ui.mystic.incarnation.activeOptions'}}">{{s        
          +ystem.activeOptions.value}}</textarea>                    
      137 +                                                          
      138 +  {{!-- Passive Skills --}}                               
      139 +  <div class="inc-section">{{localize "anima.ui.my        
          +stic.incarnation.passiveSkills"}}</div>                   
      140 +  <textarea name="system.passiveSkills.value"             
          +placeholder="{{localize                                   
          +'anima.ui.mystic.incarnation.passiveSkills'}}">{{s        
          +ystem.passiveSkills.value}}</textarea>                    
      141 +</form>                                                   

● Task 12: Update summoning tab and actor sheet              
                                                             
● Update the incarnation card in summoning.hbs — show name,
  difficulty, summonBonus, and active toggle. Remove import button.  
                                                                     
● Read 1 file (ctrl+o to expand)                                     
                                                                     
● Update(templates\actor-v2\parts\tabs\summoning.hbs)                  ⎿  Added 14 lines, removed 18 lines                                
      195          <span>{{localize                                             "anima.ui.mystic.incarnation.title"}}</span>          
      196        </div>                                              
      197        <div class="v2-card__header-actions">                     198 -        <button type="button"                             
          -class="v2-card__header-btn import-incarnation"                      -title="{{localize
          -'anima.ui.mystic.incarnation.import'}}">                        199 -          <i class="fas fa-file-import"></i>              
      200 -        </button>
      198          <button type="button"
           class="v2-card__header-btn"
           data-on-click="add-incarnation" title="{{localize
           'anima.ui.mystic.incarnation.add'}}">
      199            <i class="fas fa-plus"></i>
      200          </button>
     ...
      207        <table class="v2-table v2-table--compact">
      208          <thead>
      209            <tr>
      210 +            <th style="width:28px;"></th>                 
      211              <th>{{localize
           "anima.ui.mystic.incarnation.name"}}</th>
      212 -            <th class="v2-text-center"                    
          -style="width:80px;">{{localize                            
          -"anima.ui.mystic.incarnation.affinity.menor"}}</th>       
      213 -            <th class="v2-text-center"                    
          -style="width:80px                                         
          -;">{{localize "anima.ui.mystic.incarnation.affinity       
          -.intermedia"}}</th>                                       
      214 -            <th class="v2-text-center"                    
          -style="width:80px;">{{localize                            
          -"anima.ui.mystic.incarnation.affinity.real"}}</th>        
      212 +            <th class="v2-text-center"                    
          +style="width:45px;">Dif</th>                              
      213 +            <th class="v2-text-center"                    
          +style="width:55px                                         
          +;">{{localize "anima.ui.mystic.incarnation.               
          +summonBonus.short"}}</th>                                 
      214            </tr>
      215          </thead>
      216          <tbody
           id="incarnations-context-menu-container">
      217            {{#each system.mystic.incarnations as
           |inc|}}
      218            <tr class="incarnation-row"
           data-item-id="{{inc._id}}">
      219 +            <td class="v2-text-center"                    
          +style="padding:0;">                                       
      220 +              <input type="checkbox"                      
          +class="incarnation-toggle"                                
          +data-item-id="{{inc._id}}"                                
      221 +                     {{#if                                
          +inc.system.active.value}}checked{{/if}}                   
      222 +                     title="{{localize                    
          +'anima.ui.mystic.incarnation.active'}}">                  
      223 +            </td>                                         
      224              <td>
      225 -              <span class="v2-table__link                 
          -" title="{{inc.name}}">{{inc.name}}</span>                
      225 +              <span class="v2-table__link {{#if           
          +inc.system.active.value}}incarnation--active{{/if}}       
          +" title="{{inc.name}}">{{inc.name}}</span>                
      226              </td>
      227 -            <td class="v2-text-center"                    
          -style="font-size:0.7rem;">                                
      228 -              <span style="color:#6b8e23;">Niv            
          -{{inc.system.affinities.menor.level.value}}</span>        
      229 -              / Dif                                       
          -{{inc.system.affinities.menor.difficulty.value}}          
      227 +            <td class="v2-text-center">{{inc.syste        
          +m.difficulty.value}}</td>                                 
      228 +            <td class="v2-text-center">                   
      229 +              <input type="number"                        
          +class="incarnation-summon-bonus"                   
          +data-item-id="{{inc._id}}"                                
      230 +                                                          
          +value="{{inc.system.summonBonus.value}}"                  
      231 +                                                          
          +style="width:40px;text-align:center;border:1px            
          +solid #d4c9a8;border-radius:3px;font-size:0.75rem;        
          +padding:1px;">                                            
      232              </td>
      233 -            <td class="v2-text-center"                    
          -style="font-size:0.7rem;">                                
      234 -              <span style="color:#cd853f;">Niv            
          -{{inc.system.affinities.intermedia.level.value}}</        
          -span>                                                     
      235 -              / Dif {{inc.system.affinities.interm        
          -edia.difficulty.value}}                                   
      236 -            </td>                                         
      237 -            <td class="v2-text-center"                    
          -style="font-size:0.7rem;">                                
      238 -              <span style="color:#8b0000;">Niv            
          -{{inc.system.affinities.real.level.value}}</span>         
      239 -              / Dif                                       
          -{{inc.system.affinities.real.difficulty.value}}           
      240 -            </td>                                         
      233            </tr>
      234            {{else}}
      235            <tr>

● Now update ABFActorSheetV2.js — remove import handler, add toggle  
  handler and summonBonus inline edit handler.
                                                                     
● Read 1 file (ctrl+o to expand)                                     
     
● Replace the import handler with incarnation toggle and summonBonus
  handlers.
                                                                     ● Update(module\actor\ABFActorSheetV2.js)                            
  ⎿  Added 29 lines, removed 8 lines                                       318        }                                                         319      });                                                   
      320                                                                  321 -    // Click on incarnation row to open incarnation                 - item sheet                                               
      321 +    // Click on incarnation row to open incarnation                 + item sheet (but not on checkbox/input)               
      322      html.find('.incarnation-row').click((e) => {          
      323 +      if                                                  
          +(e.target.classList.contains('incarnation-toggle') 
          + || e.target.classList.contains('incarnation-summo        
          +n-bonus')) return;                                        
      324        e.preventDefault();
      325        const itemId =
           e.currentTarget.dataset.itemId;
      326        if (itemId) {
     ...
      330        }
      331      });
      332
      333 +    // Incarnation active toggle — only one at a          
          +time                                                      
      334 +    html.find('.incarnation-toggle').click(async          
          +(e) => {                                                  
      335 +      e.stopPropagation();                                
      336 +      const itemId =                                      
          +e.currentTarget.dataset.itemId;                           
      337 +      const isChecked = e.currentTarget.checked;          
      338 +                                                          
      339 +      if (isChecked) {                                    
      340 +        // Deactivate all other incarnations first        
      341 +        const updates = this.actor.items                  
      342 +          .filter(i => i.type ===                         
          +ABFItems.INCARNATION && i.id !== itemId &&                
          +i.system.active?.value)                                   
      343 +          .map(i => ({ _id: i.id,                         
          +'system.active.value': false }));                         
      344 +        updates.push({ _id: itemId,                       
          +'system.active.value': true });                           
      345 +        await                                             
          +this.actor.updateEmbeddedDocuments('Item',                
          +updates);                                                 
      346 +      } else {                                            
      347 +        await                                             
          +this.actor.updateEmbeddedDocuments('Item', [{ _id:        
          + itemId, 'system.active.value': false }]);                
      348 +      }                                                   
      349 +    });                                                   
      350 +                                                          
      351 +    // Incarnation summonBonus inline edit                
      352 +    html.find('.incarnation-summon-bonus').change(        
          +async (e) => {                                            
      353 +      e.stopPropagation();                                
      354 +      const itemId =                                      
          +e.currentTarget.dataset.itemId;                           
      355 +      const value =                                       
          +parseInt(e.currentTarget.value) || 0;                     
      356 +      await                                               
          +this.actor.updateEmbeddedDocuments('Item', [{ _id:        
          + itemId, 'system.summonBonus.value': value }]);           
      357 +    });                                                   
      358 +                                                          
          +html.find('.incarnation-summon-bonus').click((e)          
          +=> e.stopPropagation());                                  
      359 +                                                          
      360      // Click on creature summon link to open
           linked actor sheet
      361      html.find('.creature-summon-link').click(async        
            (e) => {
      362        e.preventDefault();
     ...
      345        }
      346      });
      347
      348 -    // Import incarnation button                          
      349 -    html.find('.import-incarnation').click(async          
          -(e) => {                                                  
      350 -      e.preventDefault();                                 
      351 -      const { importIncarnationMacro } = await            
          -import('../macros/functions/importIncarnationMacro 
          -.js');                                                    
      352 -      importIncarnationMacro(this.actor);                 
      353 -    });                                                   
      354 -                                                          
      348      // Click on summon row to open summon item
           sheet
      349      html.find('.summon-row').click((e) => {
      350        e.preventDefault();

● Task 13: Add incarnation stat override in prepareActor pipeline    
                                                                     
● Let me understand the prepareActor pipeline first.                 
    
● Read 1 file (ctrl+o to expand)                                                                                                          
● Let me look at mutateCombatData and mutateMysticData to understand   the patterns.                                                                                                                           
● Read 2 files (ctrl+o to expand)                                                                                                     
● Now let me check mutateData to understand what it does.               
● Read 1 file (ctrl+o to expand)                                        
● Good, I understand the pipeline. I'll create a new calculation that
   runs after all combat/mystic/psychic calculations to apply the      incarnation override.                            
                                                                     
● Read 1 file (ctrl+o to expand)              
                                                                     ● Write(module\actor\utils\prepareActor\calculations\actor\mystic\mut
       ateIncarnationOverride.js)                                    
  ⎿  Wrote 1 lines to module\actor\utils\prepareActor\calculatio          ns\actor\mystic\mutateIncarnationOverride.js                    
     /**                                                                   * When an incarnation is active, override the character's           combat/projection stats                                         
      * with max(own, incarnation) for: turno (initiative), HA            (attack), HD (block/dodge),                                 
      * magicProjection, and psychicProjection.                      
      *
      * Must run AFTER mutateCombatData, mutateMysticData,
     mutatePsychicData, and mutateInitiative.
      */
     export const mutateIncarnationOverride = (data) => {
         const incarnations = data.mystic?.incarnations;
         if (!incarnations || !Array.isArray(incarnations))
     return;

● Now register it in the prepareActor pipeline — it must run AFTER   
  combat, mystic, psychic, and initiative.                           
                                                   
● Update(module\actor\utils\prepareActor\prepareActor.js)      
  ⎿  Added 1 line
      12  import { mutateMysticData } from                           
          "./calculations/actor/mystic/mutateMysticData.js";  
      13  import { mutatePsychicData } from "./calculations/a                  ctor/psychic/mutatePsychicData.js";                        
      14  import { mutateDomineData } from                                     "./calculations/actor/domine/mutateDomineData.js";               15 +import { mutateIncarnationOverride } from "./calcul    
         +ations/actor/mystic/mutateIncarnationOverride.js";         
      16  import { mutateInitiative } from
          "./calculations/actor/mutateInitiative.js";
      17  import { mutateRegenerationType } from "./calculati        
          ons/actor/general/mutateRegenerationType.js";
      18  import { mutateMasaData } from
          "./calculations/actor/mutateMasaData.js";
  ⎿  You've hit your limit · resets Feb 16, 1pm (Europe/Madrid)