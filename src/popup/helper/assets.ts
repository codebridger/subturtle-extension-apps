export function getAsset(assetPath:string)  {
	return chrome.runtime.getURL('/assets/' + assetPath);
}