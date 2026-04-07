import{n as e,t}from"./nav-DImyApw8.js";import{t as n}from"./videos-Bjk9PVz8.js";document.getElementById(`kh-nav-mount`).innerHTML=t;var r=[{id:`music-videos`,label:`Music Videos`,videoIds:[1,2,3,4,5,6,8,10,13]},{id:`commercials`,label:`Commercials`,videoIds:[7,9,12]},{id:`all-work`,label:`All Work`,videoIds:[1,2,3,4,5,6,7,8,9,10,11,12,13]}],i=r[0].id,a=null,o=null,s=document.getElementById(`reelTabs`),c=document.getElementById(`reelList`),l=document.getElementById(`reelPlayerArea`),u=document.getElementById(`reelEmpty`),d=document.getElementById(`reelMeta`),f=document.getElementById(`reelMetaTitle`),p=document.getElementById(`reelMetaType`);function m(e){let t=r.find(t=>t.id===e);return t?t.videoIds.map(e=>n.find(t=>t.id===e)).filter(Boolean):[]}function h(){s.innerHTML=``,r.forEach(e=>{let t=document.createElement(`button`);t.className=`kh-reel-tab`+(e.id===i?` active`:``),t.textContent=e.label,t.addEventListener(`click`,()=>_(e.id)),s.appendChild(t)})}function g(){let t=m(i);c.innerHTML=``,t.forEach(t=>{let n=document.createElement(`div`);n.className=`kh-reel-item`+(t.id===a?` active`:``),n.dataset.id=t.id;let r=`https://image.mux.com/${t.playbackId}/thumbnail.webp?width=200&time=3`,i=t.stills.length>0?`${e.assetsBase}/Stills/${t.stills[0]}`:``;n.innerHTML=`
      <div class="kh-reel-thumb">
        <img
          src="${r}"
          alt="${t.title}"
          loading="lazy"
          onerror="if(this.src!=='${i}')this.src='${i}'"
        >
      </div>
      <div class="kh-reel-info">
        <span class="info-artist">${t.artist}</span>
        ${t.song?`<span class="info-song">${t.song}</span>`:``}
        <span class="info-type">${t.type}</span>
      </div>
    `,n.addEventListener(`click`,()=>v(t.id)),c.appendChild(n)})}function _(e){i=e,a=null,s.querySelectorAll(`.kh-reel-tab`).forEach(t=>{t.classList.toggle(`active`,t.textContent===r.find(t=>t.id===e).label)}),y(),g()}function v(e){let t=n.find(t=>t.id===e);t&&(a=e,c.querySelectorAll(`.kh-reel-item`).forEach(t=>{t.classList.toggle(`active`,parseInt(t.dataset.id)===e)}),o&&o.remove(),u.style.display=`none`,o=document.createElement(`mux-player`),o.setAttribute(`playback-id`,t.playbackId),o.setAttribute(`metadata-video-title`,t.title),o.setAttribute(`playsinline`,``),o.setAttribute(`autoplay`,``),o.style.cssText=`position:absolute; inset:0; width:100%; height:100%;`,l.appendChild(o),f.textContent=t.title,p.textContent=t.type,d.style.display=`flex`)}function y(){o&&=(o.remove(),null),u.style.display=`flex`,d.style.display=`none`}h(),g();