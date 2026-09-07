<template>
  <q-page class="crossword-page">
    <div class="page-shell">
      <header class="page-header">
        <div class="header-left">
          <q-btn flat round dense icon="arrow_back" aria-label="Volver" @click="goBack" />
          <div class="activity-icon"><q-icon name="grid_on" /></div>
          <div><h1>Crucigrama bíblico</h1><p>Crea un tablero real con palabras cruzadas y pistas bíblicas.</p></div>
        </div>
        <q-btn v-if="mode === 'library'" unelevated no-caps icon="add" label="Nuevo crucigrama" class="primary" @click="createActivity" />
        <div v-else-if="mode === 'editor'" class="header-actions">
          <q-btn flat no-caps label="Cancelar" @click="cancelEditor" />
          <q-btn unelevated no-caps icon="save" label="Guardar" class="primary" @click="saveActivity" />
        </div>
        <div v-else class="header-actions">
          <q-badge color="positive">EN VIVO</q-badge>
          <q-btn flat no-caps icon="close" label="Salir" @click="stopGame" />
          <q-btn unelevated no-caps icon="cast" label="Actualizar en vivo" class="primary" @click="sendLive" />
        </div>
      </header>

      <section v-if="mode === 'library'" class="library">
        <div v-if="activities.length === 0" class="empty-state">
          <q-icon name="grid_on" size="60px" /><h2>No hay crucigramas guardados</h2>
          <p>Crea palabras, pistas y deja que ICP Studio construya la cuadrícula automáticamente.</p>
          <q-btn unelevated no-caps icon="add" label="Crear crucigrama" class="primary" @click="createActivity" />
        </div>
        <div v-else class="cards">
          <article v-for="activity in activities" :key="activity.id" class="card">
            <div class="card-icon"><q-icon name="grid_on" /></div>
            <div class="card-copy"><h3>{{ activity.title }}</h3><span>{{ activity.rounds.length }} palabras</span></div>
            <div class="card-actions">
              <q-btn flat round dense icon="edit" @click="editActivity(activity)" />
              <q-btn flat round dense icon="delete_outline" color="red-4" @click="removeActivity(activity)" />
              <q-btn unelevated no-caps icon="play_arrow" label="Abrir" class="primary" @click="playActivity(activity)" />
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="mode === 'editor'" class="editor-layout">
        <aside class="editor-panel">
          <label>Nombre del crucigrama</label>
          <q-input v-model="title" dark outlined dense placeholder="Ej. Personajes del Antiguo Testamento" />
          <div class="section-heading"><div><strong>Palabras y pistas</strong><small>{{ rounds.length }} palabras</small></div><q-btn flat dense no-caps icon="add" label="Agregar" @click="addWord" /></div>
          <div class="word-list">
            <button v-for="(round,index) in rounds" :key="round.id" type="button" class="word-row" :class="{active: round.id === activeId}" @click="activeId = round.id">
              <span>{{ index + 1 }}</span><div><strong>{{ round.answer || 'Sin palabra' }}</strong><small>{{ round.prompt || 'Sin pista' }}</small></div>
              <q-btn v-if="rounds.length > 2" flat round dense icon="close" @click.stop="deleteWord(round.id)" />
            </button>
          </div>
        </aside>
        <main class="editor-main">
          <div v-if="activeRound" class="word-editor">
            <div class="field-block"><label>Palabra</label><q-input v-model="activeRound.answer" dark outlined dense placeholder="NOE" @update:model-value="rebuildPreview" /></div>
            <div class="field-block"><label>Pista</label><q-input v-model="activeRound.prompt" dark outlined dense autogrow placeholder="Construyó un arca por mandato de Dios" /></div>
            <div class="field-block"><label>Referencia bíblica</label><q-input v-model="activeRound.bibleReference" dark outlined dense placeholder="Génesis 6" /></div>
          </div>
          <div class="board-panel">
            <div class="board-heading"><div><span>PREVISUALIZACIÓN</span><h2>{{ title || 'Crucigrama bíblico' }}</h2></div><q-badge>{{ placedWords.length }} colocadas</q-badge></div>
            <div v-if="board.cells.length" class="crossword-board" :style="boardStyle">
              <div v-for="cell in board.cells" :key="`${cell.row}-${cell.col}`" class="crossword-cell" :class="{blocked: !cell.letter}">
                <template v-if="cell.letter"><small v-if="cell.number">{{ cell.number }}</small><strong>{{ cell.letter }}</strong></template>
              </div>
            </div>
            <div v-else class="board-empty">Agrega al menos dos palabras compatibles para construir el tablero.</div>
            <div class="clues"><div><h3>Horizontales</h3><p v-for="item in horizontalWords" :key="item.id"><b>{{ item.number }}.</b> {{ item.prompt }}</p></div><div><h3>Verticales</h3><p v-for="item in verticalWords" :key="item.id"><b>{{ item.number }}.</b> {{ item.prompt }}</p></div></div>
          </div>
        </main>
      </section>

      <section v-else class="play-layout">
        <aside class="operator-panel">
          <h2>{{ playing?.title }}</h2><p>{{ solvedIds.size }} de {{ placedWords.length }} palabras reveladas</p>
          <button v-for="word in placedWords" :key="word.id" type="button" class="clue-control" :class="{solved: solvedIds.has(word.id)}" @click="toggleSolved(word.id)">
            <span>{{ word.number }}</span><div><strong>{{ word.prompt }}</strong><small>{{ solvedIds.has(word.id) ? word.answer : 'Oculta' }}</small></div>
          </button>
          <q-btn flat no-caps icon="restart_alt" label="Ocultar todas" @click="clearSolved" />
        </aside>
        <main class="game-stage">
          <div class="stage-title"><span>CRUCIGRAMA BÍBLICO</span><h1>{{ playing?.title }}</h1></div>
          <div class="crossword-board crossword-board--play" :style="boardStyle">
            <div v-for="cell in board.cells" :key="`${cell.row}-${cell.col}`" class="crossword-cell" :class="{blocked: !cell.letter}">
              <template v-if="cell.letter"><small v-if="cell.number">{{ cell.number }}</small><strong>{{ isCellRevealed(cell) ? cell.letter : '' }}</strong></template>
            </div>
          </div>
          <div class="clues clues--play"><div><h3>Horizontales</h3><p v-for="item in horizontalWords" :key="item.id"><b>{{ item.number }}.</b> {{ item.prompt }}</p></div><div><h3>Verticales</h3><p v-for="item in verticalWords" :key="item.id"><b>{{ item.number }}.</b> {{ item.prompt }}</p></div></div>
        </main>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { createBibleActivityId, deleteBibleActivity, getBibleActivities, saveBibleActivity } from '../services/bible-activity-library';
import type { BibleActivityRecord, BibleActivityRound } from '../shared/bible-activities';

type Mode = 'library' | 'editor' | 'play';
type Direction = 'across' | 'down';
interface PlacedWord { id:string; answer:string; prompt:string; bibleReference:string; row:number; col:number; direction:Direction; number:number; }
interface BoardCell { row:number; col:number; letter:string; number:number|null; wordIds:string[]; }
interface Board { rows:number; cols:number; cells:BoardCell[]; }

const router=useRouter(); const $q=useQuasar(); const mode=ref<Mode>('library'); const activities=ref<BibleActivityRecord[]>([]); const editingId=ref<string|null>(null); const title=ref(''); const rounds=ref<BibleActivityRound[]>([]); const activeId=ref(''); const playing=ref<BibleActivityRecord|null>(null); const solvedIds=ref(new Set<string>()); const placedWords=ref<PlacedWord[]>([]); const board=ref<Board>({rows:0,cols:0,cells:[]});
const activeRound=computed(()=>rounds.value.find(r=>r.id===activeId.value)??null); const boardStyle=computed(()=>({'--cw-cols':String(board.value.cols),'--cw-rows':String(board.value.rows)})); const horizontalWords=computed(()=>placedWords.value.filter(w=>w.direction==='across')); const verticalWords=computed(()=>placedWords.value.filter(w=>w.direction==='down'));
function normalizeWord(value:string):string{return value.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
function newRound():BibleActivityRound{return{id:createBibleActivityId('crossword-round'),prompt:'',answer:'',bibleReference:'',hint:'',explanation:''};}
function reload():void{activities.value=getBibleActivities('crossword');}
function goBack():void{if(mode.value!=='library'){stopGame();mode.value='library';return;}void router.push('/actividades');}
function createActivity():void{editingId.value=null;title.value='';rounds.value=[newRound(),newRound()];activeId.value=rounds.value[0]?.id??'';rebuildPreview();mode.value='editor';}
function editActivity(a:BibleActivityRecord):void{editingId.value=a.id;title.value=a.title;rounds.value=a.rounds.map(r=>({...r}));activeId.value=rounds.value[0]?.id??'';rebuildPreview();mode.value='editor';}
function cancelEditor():void{mode.value='library';}
function addWord():void{const r=newRound();rounds.value.push(r);activeId.value=r.id;rebuildPreview();}
function deleteWord(id:string):void{rounds.value=rounds.value.filter(r=>r.id!==id);activeId.value=rounds.value[0]?.id??'';rebuildPreview();}
function rebuildPreview():void{const result=buildCrossword(rounds.value);placedWords.value=result.words;board.value=result.board;}
function validate():boolean{if(!title.value.trim()){warn('Escribe un nombre para el crucigrama.');return false;}const valid=rounds.value.filter(r=>normalizeWord(r.answer).length>=2&&r.prompt.trim());if(valid.length<2){warn('Agrega al menos dos palabras con sus pistas.');return false;}return true;}
function saveActivity():void{if(!validate())return;const now=new Date().toISOString();const existing=editingId.value?activities.value.find(a=>a.id===editingId.value):null;saveBibleActivity({id:editingId.value??createBibleActivityId('crossword'),type:'crossword',title:title.value.trim(),rounds:rounds.value.map(r=>({...r,answer:normalizeWord(r.answer),prompt:r.prompt.trim(),bibleReference:r.bibleReference.trim()})),createdAt:existing?.createdAt??now,updatedAt:now});reload();mode.value='library';$q.notify({type:'positive',message:'Crucigrama guardado.',position:'top'});}
function removeActivity(a:BibleActivityRecord):void{if(!window.confirm(`¿Eliminar “${a.title}”?`))return;deleteBibleActivity(a.id);reload();}
function playActivity(a:BibleActivityRecord):void{playing.value=a;solvedIds.value=new Set();const result=buildCrossword(a.rounds);placedWords.value=result.words;board.value=result.board;mode.value='play';sendLive();}
function stopGame():void{if(mode.value==='play')window.icpStudio?.projection.setState({mode:'blank'});playing.value=null;solvedIds.value=new Set();}
function toggleSolved(id:string):void{
  const next=new Set(solvedIds.value);
  if(next.has(id)){
    next.delete(id);
  }else{
    next.add(id);
  }
  solvedIds.value=next;
  sendLive();
}
function clearSolved():void{solvedIds.value=new Set();sendLive();}
function isCellRevealed(cell:BoardCell):boolean{return cell.wordIds.some(id=>solvedIds.value.has(id));}
function sendLive():void{if(!playing.value)return;const text=renderProjectionText();window.icpStudio?.projection.setState({mode:'content',title:playing.value.title,body:text,footer:'Crucigrama bíblico'});}
function renderProjectionText():string{const lines=placedWords.value.map(w=>`${w.number}. ${w.prompt}${solvedIds.value.has(w.id)?` — ${w.answer}`:''}`);return lines.join('\n\n');}
function warn(message:string):void{$q.notify({type:'warning',message,position:'top'});}
function buildCrossword(source:BibleActivityRound[]):{words:PlacedWord[];board:Board}{const entries=source.map(r=>({...r,word:normalizeWord(r.answer)})).filter(r=>r.word.length>=2&&r.prompt.trim()).sort((a,b)=>b.word.length-a.word.length);if(!entries.length)return{words:[],board:{rows:0,cols:0,cells:[]}};const grid=new Map<string,{letter:string;wordIds:string[]}>();const words:PlacedWord[]=[];const key=(r:number,c:number)=>`${r}:${c}`;const place=(entry:typeof entries[number],row:number,col:number,direction:Direction)=>{const chars=[...entry.word];chars.forEach((ch,i)=>{const r=row+(direction==='down'?i:0);const c=col+(direction==='across'?i:0);const k=key(r,c);const current=grid.get(k);if(current){current.wordIds.push(entry.id);}else{grid.set(k,{letter:ch,wordIds:[entry.id]});}});words.push({id:entry.id,answer:entry.word,prompt:entry.prompt,bibleReference:entry.bibleReference,row,col,direction,number:0});};place(entries[0]!,0,0,'across');for(const entry of entries.slice(1)){let placed=false;for(const existing of words){if(placed)break;for(let ei=0;ei<existing.answer.length&&!placed;ei++){const ch=existing.answer[ei];for(let ni=0;ni<entry.word.length&&!placed;ni++){if(entry.word[ni]!==ch)continue;const direction:Direction=existing.direction==='across'?'down':'across';const crossRow=existing.row+(existing.direction==='down'?ei:0);const crossCol=existing.col+(existing.direction==='across'?ei:0);const row=crossRow-(direction==='down'?ni:0);const col=crossCol-(direction==='across'?ni:0);if(canPlace(entry.word,row,col,direction,grid,key)){place(entry,row,col,direction);placed=true;}}}}if(!placed){const maxRow=Math.max(...[...grid.keys()].map(k=>Number(k.split(':')[0])));place(entry,maxRow+2,0,'across');}}const minRow=Math.min(...words.map(w=>w.row));const minCol=Math.min(...words.map(w=>w.col));words.forEach(w=>{w.row-=minRow;w.col-=minCol;});const shifted=new Map<string,{letter:string;wordIds:string[]}>();grid.forEach((v,k)=>{const [r,c]=k.split(':').map(Number);shifted.set(key((r??0)-minRow,(c??0)-minCol),v);});const numberMap=new Map<string,number>();let number=1;[...words].sort((a,b)=>a.row-b.row||a.col-b.col).forEach(w=>{const k=key(w.row,w.col);if(!numberMap.has(k))numberMap.set(k,number++);w.number=numberMap.get(k)!;});const maxRow=Math.max(...words.map(w=>w.row+(w.direction==='down'?w.answer.length-1:0)));const maxCol=Math.max(...words.map(w=>w.col+(w.direction==='across'?w.answer.length-1:0)));const cells:BoardCell[]=[];for(let r=0;r<=maxRow;r++){for(let c=0;c<=maxCol;c++){const v=shifted.get(key(r,c));cells.push({row:r,col:c,letter:v?.letter??'',number:numberMap.get(key(r,c))??null,wordIds:v?.wordIds??[]});}}return{words,board:{rows:maxRow+1,cols:maxCol+1,cells}};}
function canPlace(word:string,row:number,col:number,direction:Direction,grid:Map<string,{letter:string;wordIds:string[]}>,key:(r:number,c:number)=>string):boolean{for(let i=0;i<word.length;i++){const r=row+(direction==='down'?i:0);const c=col+(direction==='across'?i:0);const current=grid.get(key(r,c));if(current&&current.letter!==word[i])return false;}return true;}
onMounted(reload);
</script>

<style scoped>
.crossword-page{min-height:100%;padding:16px;color:#dce7f4;background:#08111c}.page-shell{min-height:calc(100vh - 98px);overflow:hidden;background:#0c1521;border:1px solid #25364a;border-radius:14px}.page-header,.header-left,.header-actions,.section-heading,.board-heading,.card,.card-actions{display:flex;align-items:center}.page-header{min-height:74px;justify-content:space-between;gap:16px;padding:12px 18px;background:#0d1825;border-bottom:1px solid #25364a}.header-left,.header-actions{gap:10px}.activity-icon,.card-icon{display:grid;place-items:center;color:#c4b5fd;background:#8b5cf61a;border:1px solid #8b5cf644}.activity-icon{width:44px;height:44px;border-radius:12px}.page-header h1,.card h3,.board-heading h2{margin:0}.page-header p{margin:4px 0 0;color:#8191a5;font-size:11px}.primary{color:#fff;background:#2563eb;border-radius:9px}.library{padding:20px}.empty-state{display:grid;min-height:430px;place-items:center;align-content:center;gap:10px;color:#718399;text-align:center}.cards{display:grid;gap:10px}.card{gap:12px;padding:14px;background:#0d1825;border:1px solid #25384c;border-radius:12px}.card-icon{width:40px;height:40px;border-radius:10px}.card-copy{min-width:0;flex:1}.card-copy span{color:#718399;font-size:10px}.card-actions{gap:6px}.editor-layout,.play-layout{display:grid;grid-template-columns:360px minmax(0,1fr);min-height:calc(100vh - 174px)}.editor-panel,.operator-panel{overflow:auto;padding:16px;background:#09131e;border-right:1px solid #25364a}.editor-panel>label,.field-block label{display:block;margin-bottom:7px;color:#c4d0dd;font-size:11px}.section-heading{justify-content:space-between;margin:18px 0 10px}.section-heading div{display:flex;flex-direction:column}.section-heading small{color:#718399}.word-list{display:grid;gap:6px}.word-row,.clue-control{display:flex;width:100%;align-items:center;gap:9px;padding:9px;color:#c9d5e2;text-align:left;background:#0d1926;border:1px solid #26394e;border-radius:9px}.word-row.active,.clue-control.solved{border-color:#8b5cf6;background:#8b5cf612}.word-row>span,.clue-control>span{display:grid;width:26px;height:26px;place-items:center;background:#17283a;border-radius:7px}.word-row>div,.clue-control>div{display:flex;min-width:0;flex:1;flex-direction:column}.word-row small,.clue-control small{overflow:hidden;color:#718399;text-overflow:ellipsis;white-space:nowrap}.editor-main{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);gap:16px;padding:16px}.word-editor{padding:14px;background:#0d1825;border:1px solid #25384c;border-radius:11px}.field-block{margin-bottom:14px}.board-panel,.game-stage{min-width:0;padding:16px;background:#08111c}.board-heading{justify-content:space-between;margin-bottom:12px}.board-heading span,.stage-title span{color:#7c8da1;font-size:9px;letter-spacing:.1em}.crossword-board{display:grid;grid-template-columns:repeat(var(--cw-cols),minmax(28px,1fr));grid-template-rows:repeat(var(--cw-rows),minmax(28px,1fr));width:min(100%,760px);aspect-ratio:1/1;margin:auto;background:#050a10;border:6px solid #050a10}.crossword-cell{position:relative;display:grid;place-items:center;color:#0b1320;background:#f8fafc;border:1px solid #aab7c5;font-weight:800}.crossword-cell.blocked{background:#050a10;border-color:#050a10}.crossword-cell small{position:absolute;top:1px;left:2px;font-size:7px;font-weight:700}.crossword-cell strong{font-size:clamp(10px,1.3vw,20px)}.board-empty{display:grid;min-height:280px;place-items:center;color:#60748b;border:1px dashed #31465c;border-radius:12px}.clues{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;padding:14px;background:#0d1825;border:1px solid #25384c;border-radius:11px}.clues h3{margin:0 0 8px;color:#c4b5fd;font-size:12px}.clues p{margin:6px 0;color:#a8b6c6;font-size:10px}.operator-panel h2{margin:0}.operator-panel>p{color:#718399}.clue-control{margin-bottom:6px;cursor:pointer}.game-stage{overflow:auto}.stage-title{text-align:center;margin-bottom:14px}.stage-title h1{margin:4px 0 0}.crossword-board--play{width:min(72vh,760px)}.clues--play{max-width:900px;margin:16px auto 0}@media(max-width:900px){.editor-layout,.play-layout,.editor-main{grid-template-columns:1fr}.editor-panel,.operator-panel{border-right:0;border-bottom:1px solid #25364a}.clues{grid-template-columns:1fr}}
</style>
