function renderAcademic(containerId,data){
  const wrap=document.getElementById(containerId);
  const grid=document.createElement('div');
  grid.className='rivers-academic-grid';

  data.sort((a,b)=>Number(b.year)-Number(a.year));

  data.forEach(item=>{
    const card=document.createElement('article');
    card.className='rivers-academic-card';
    card.innerHTML=`
      <div class="rivers-academic-badges">
        <span class="rivers-academic-badge">${item.year}</span>
        <span class="rivers-academic-badge">${item.type}</span>
        <span class="rivers-academic-badge">${item.domain}</span>
      </div>
      <p class="rivers-academic-ref">${item.ref}</p>
    `;
    grid.appendChild(card);
  });

  wrap.appendChild(grid);

  const h=Math.ceil(wrap.getBoundingClientRect().height)+2;
  parent.postMessage({type:'resize',source:'rivers-academic',height:h},'*');
}
