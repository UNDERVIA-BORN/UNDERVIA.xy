const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = {words:[], filtered:[], selected:null, saved:new Set(JSON.parse(localStorage.getItem('undervia_saved')||'[]')), reviewed:new Set(JSON.parse(localStorage.getItem('undervia_reviewed')||'[]')), savedOnly:false};
const grid = $('#pathGrid'), vocabView=$('#vocabView'), wordList=$('#wordList'), detail=$('#wordDetail');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1900)}
function updateStats(){
  $('#savedCount').textContent=state.saved.size;$('#learnedCount').textContent=state.reviewed.size;$('#savedFilterCount').textContent=state.saved.size;
  const pct=Math.round(state.reviewed.size/Math.max(state.words.length,1)*100);$('#progressPercent').textContent=pct+'%';$('#progressBar').style.width=pct+'%';
}
async function init(){
  $('#year').textContent=new Date().getFullYear();
  const [cats,words]=await Promise.all([fetch('data/categories.json').then(r=>r.json()),fetch('data/general-english.json').then(r=>r.json())]);
  state.words=words;state.filtered=words;
  grid.innerHTML=cats.map(c=>`<article class="path-card ${c.id==='general-english'?'available':''}" ${c.id==='general-english'?'data-open-vocab':''}><span class="path-number">${c.number} / LEARNING PATH</span><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.description)}</p><div class="path-bottom"><span class="path-target">${c.id==='general-english'?'150 CURATED ENTRIES':'STRUCTURE IN DEVELOPMENT'}</span>${c.id==='general-english'?'<span class="path-arrow">↗</span>':'<span class="coming">COMING NEXT</span>'}</div></article>`).join('');
  updateStats();renderWords();
}
function openVocab(){vocabView.classList.add('active');vocabView.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('#searchInput').focus()}
function closeVocab(){vocabView.classList.remove('active');vocabView.setAttribute('aria-hidden','true');document.body.style.overflow='';}
function renderWords(){
  const query=$('#searchInput').value.trim().toLowerCase(),level=$('#levelFilter').value,sort=$('#sortSelect').value;
  let items=state.words.filter(w=>(!query||[w.word,w.meaning,w.definition,w.partOfSpeech].join(' ').toLowerCase().includes(query))&&(level==='all'||w.level===level)&&(!state.savedOnly||state.saved.has(w.word)));
  items.sort((a,b)=>a.word.localeCompare(b.word));if(sort==='za')items.reverse();state.filtered=items;
  $('#resultCount').textContent=`${items.length} ${items.length===1?'WORD':'WORDS'}`;$('#vocabCounter').textContent=`${items.length} / 150 WORDS`;
  wordList.innerHTML=items.length?items.map(w=>`<button class="word-item ${state.selected===w.word?'selected':''}" data-word="${escapeHTML(w.word)}"><span><strong>${escapeHTML(w.word)}</strong><small>${escapeHTML(w.meaning)}</small></span><span class="word-level">${escapeHTML(w.level)}</span></button>`).join(''):'<div class="detail-empty"><p>No vocabulary matches your search.</p></div>';
  $$('.word-item',wordList).forEach(btn=>btn.addEventListener('click',()=>selectWord(btn.dataset.word)));
}
function selectWord(word){
  const w=state.words.find(x=>x.word===word);if(!w)return;state.selected=word;state.reviewed.add(word);localStorage.setItem('undervia_reviewed',JSON.stringify([...state.reviewed]));updateStats();renderWords();
  const saved=state.saved.has(w.word);
  detail.innerHTML=`<div class="detail-top"><span class="detail-level">${escapeHTML(w.level)} · GENERAL ENGLISH</span><button class="save-word ${saved?'saved':''}" id="saveWord">${saved?'♥ Saved':'♡ Save word'}</button></div>
  <h2 class="detail-word">${escapeHTML(w.word)}</h2><div class="detail-pron">${w.ipa?escapeHTML(w.ipa)+' · ':''}${w.pronunciation?escapeHTML(w.pronunciation)+' · ':''}${escapeHTML(w.partOfSpeech)}</div>
  <div class="detail-section"><h4>ENGLISH DEFINITION</h4><p>${escapeHTML(w.definition)}</p><p class="translation">${escapeHTML(w.meaning)}</p></div>
  <div class="detail-section"><h4>EXAMPLE SENTENCE</h4><p>${escapeHTML(w.example)}</p><p class="translation">${escapeHTML(w.exampleTranslation)}</p></div>
  <div class="detail-section"><h4>SYNONYMS</h4><div class="detail-tags">${w.synonyms.length?w.synonyms.map(x=>`<span>${escapeHTML(x)}</span>`).join(''):'<span>—</span>'}</div></div>
  ${w.antonyms.length?`<div class="detail-section"><h4>ANTONYMS</h4><div class="detail-tags">${w.antonyms.map(x=>`<span>${escapeHTML(x)}</span>`).join('')}</div></div>`:''}
  ${w.usage?`<div class="detail-section"><h4>USAGE NOTE</h4><p class="usage-note">${escapeHTML(w.usage)}</p></div>`:''}`;
  $('#saveWord').addEventListener('click',()=>toggleSave(w.word));
}
function toggleSave(word){
  if(state.saved.has(word)){state.saved.delete(word);toast('Removed from saved vocabulary.')}else{state.saved.add(word);toast('Word saved to your collection.')}
  localStorage.setItem('undervia_saved',JSON.stringify([...state.saved]));updateStats();if(state.selected===word)selectWord(word);else renderWords();
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-open-vocab]')){e.preventDefault();openVocab()}
});
$('#backHome').addEventListener('click',closeVocab);
$('#searchInput').addEventListener('input',renderWords);
$('#levelFilter').addEventListener('change',renderWords);
$('#sortSelect').addEventListener('change',renderWords);
$('#savedFilter').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;$('#savedFilter').classList.toggle('active',state.savedOnly);$('#savedFilter').style.borderColor=state.savedOnly?'#79a7ff':'';renderWords()});
$('#menuToggle').addEventListener('click',()=>{const open=$('#mainNav').classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open))});
$$('#mainNav a').forEach(a=>a.addEventListener('click',()=>$('#mainNav').classList.remove('open')));
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&vocabView.classList.contains('active'))closeVocab()});
init().catch(err=>{console.error(err);grid.innerHTML='<p>Learning paths could not be loaded. Please run this site through a local server or GitHub Pages.</p>'});
