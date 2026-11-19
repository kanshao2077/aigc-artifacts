// Both activities browse fixed crops of the original paper figures.
export function mountGame(root, id, original) {
  const source = document.createElement('a');
  source.href = original;
  source.target = '_blank';
  source.rel = 'noopener';
  source.textContent = '核对论文原图 ↗';
  if (id === 'gan') mountPairs(root);
  else mountMap(root);
  root.querySelector('.game-footer').append(source);
}

function mountPairs(root) {
  root.innerHTML = `<h2>哪张来自训练集？</h2><div class="sample-pair"></div>
    <div class="game-footer"><button class="next-pair" disabled>换一组</button></div>`;
  const pair = root.querySelector('.sample-pair');
  const caption = root.parentElement.querySelector('.media-caption p');
  const next = root.querySelector('.next-pair');
  caption.setAttribute('aria-live','polite');
  let remaining = [];
  function deal() {
    if (!remaining.length) remaining = [0,1,2,3,4,5,6,7];
    const row = remaining.splice(Math.floor(Math.random()*remaining.length),1)[0];
    const realIndex = Math.floor(Math.random()*2);
    caption.textContent = '选一张。两张图来自论文图 2 的同一行，一张由 GAN 生成，另一张是作者列出的相近训练样本。';
    pair.replaceChildren();
    next.disabled = true;
    for (let i=0;i<2;i++) {
      const button = document.createElement('button');
      const real = i===realIndex;
      button.innerHTML = `<span class="gan-crop"></span><span class="sample-label">样本 ${i?'B':'A'}</span>`;
      button.querySelector('.gan-crop').style.backgroundPosition = `${real?100:0}% ${row*100/7}%`;
      button.onclick = () => {
        Array.from(pair.children).forEach((b,j)=>{
          b.disabled=true;
          b.querySelector('.sample-label').textContent = j===realIndex?'训练样本':'生成样本';
        });
        caption.textContent = (real?'猜中了。':'另一张才是训练样本。')+' 原图中，黄框标出训练样本，紧挨它的左侧是这次配对的生成样本。';
        next.disabled=false;
        next.focus({preventScroll:true});
      };
      pair.append(button);
    }
  }
  next.onclick=()=>{deal();pair.firstElementChild.focus({preventScroll:true})};
  deal();
}

function mountMap(root) {
  root.innerHTML = `<h2>在数字地图里找字形</h2>
    <div class="map-work"><div class="digit-map" tabindex="0" role="group" aria-label="论文数字地图，使用方向键移动"><i></i></div>
    <div class="map-comparison"><div class="digit-target"><span class="current-crop"></span><span>当前位置</span></div><div class="digit-target"><span class="target-crop"></span><span>目标字形</span></div></div></div>
    <div class="game-footer"><button class="map-next">换个目标</button><button class="map-hint">提示位置</button></div>`;
  const map=root.querySelector('.digit-map'), marker=map.querySelector('i');
  const target=root.querySelector('.target-crop');
  const caption=root.parentElement.querySelector('.media-caption p');
  caption.setAttribute('aria-live','polite');
  let x=9,y=9,tx,ty,solved=false;
  function select(col,row) {
    x=Math.min(19,Math.max(0,col));y=Math.min(19,Math.max(0,row));
    marker.style.left=x*5+'%';marker.style.top=y*5+'%';
    root.querySelector('.current-crop').style.backgroundPosition=`${x*100/19}% ${y*100/19}%`;
    const distance=Math.max(Math.abs(x-tx),Math.abs(y-ty));
    solved ||= distance===0;
    map.classList.toggle('solved',solved);
    const hint=solved?'已找到，可以继续探索或换个目标。':distance<3?'很近了，再挪一两格。':'沿图格寻找右侧字形。';
    caption.textContent=`第 ${y+1} 行，第 ${x+1} 列。 ${hint} 点击、拖动或用方向键移动。`;
  }
  function newTarget() {
    // Pick a different cell, at least four steps from the cursor.
    const candidates=[];
    for(let col=0;col<20;col++)for(let row=0;row<20;row++)
      if(Math.max(Math.abs(col-x),Math.abs(row-y))>=4 && (col!==tx||row!==ty))candidates.push([col,row]);
    [tx,ty]=candidates[Math.floor(Math.random()*candidates.length)];
    solved=false;
    target.style.backgroundPosition=`${tx*100/19}% ${ty*100/19}%`;
    select(x,y);
  }
  const locate=e=>{
    const r=map.getBoundingClientRect();
    select(Math.floor((e.clientX-r.left)*20/r.width),Math.floor((e.clientY-r.top)*20/r.height));
  };
  map.onpointerdown=e=>{map.focus({preventScroll:true});map.setPointerCapture(e.pointerId);locate(e)};
  map.onpointermove=e=>{if(map.hasPointerCapture(e.pointerId))locate(e)};
  const keys={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  map.onkeydown=e=>{if(keys[e.key]){e.preventDefault();e.stopPropagation();select(x+keys[e.key][0],y+keys[e.key][1])}};
  root.querySelector('.map-next').onclick=()=>{newTarget();map.focus({preventScroll:true})};
  root.querySelector('.map-hint').onclick=()=>{
    caption.textContent=`目标在第 ${ty+1} 行、第 ${tx+1} 列。当前在第 ${y+1} 行、第 ${x+1} 列。`;
    map.focus({preventScroll:true});
  };
  newTarget();
}
