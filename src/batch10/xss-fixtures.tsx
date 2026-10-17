// Static-only Batch 10 scanner fixtures. This file is never imported by a page.
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
export function planted(node:any, frame:any, sanitizer:any) {
 node.insertAdjacentHTML('beforeend',location.hash);
 frame.srcdoc=location.hash;
 sanitizer.bypassSecurityTrustResourceUrl(location.hash);
 DOMPurify.sanitize(location.hash);
 node.innerHTML=window.name;
 const view=<div dangerouslySetInnerHTML={{__html:location.hash}}/>;
 unsafeHTML(location.hash);
 return view;
}
export function clean(node:any) { node.textContent=location.hash; }
