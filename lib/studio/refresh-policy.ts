/** One per-client-instance gate shared by every component refresh callback. */
export function refreshGate(intervalMs=15000){let lastAttempt=-Infinity;return{
 allow(background:boolean,hidden:boolean,now=Date.now()){
  if(!background)return true;
  if(hidden||now-lastAttempt<intervalMs)return false;
  lastAttempt=now;return true;
 },reset(){lastAttempt=-Infinity;}
};}
