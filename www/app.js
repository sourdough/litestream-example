function _form(event){
	const {type,submitter} = event;
	event.preventDefault();
	switch(type){
	case 'cancel':
		// TODO
	break;
	default:
		const action = submitter.getAttribute('action');
		fetch(action)
			.then(res=>res.json())
			.then(obj=>{
				console.log(type, {action, obj, submitter});
				requestAnimationFrame(()=>{
					const node = document.createElement('pre');
					node.textContent = JSON.stringify(obj,false,'\t');
					const parent = document.body.querySelector('[output]');
					parent.insertBefore(node, parent.firstChild);
				});
			})
			.catch(console.error)
			;
	}
}
requestAnimationFrame(()=>{
	document.body.innerHTML = `
<form>
<label>click any:</label>
	<button action='/pt'></button>	
	<button action='/pts'></button>	
	<button action='/info'></button>	
</form>
<div output></div>
<style>
form{margin:0.2rem;position:sticky;top:0.2rem;height:2rem;display:block;}
button{margin:0.2em;}
button:before{content:attr(action);}
[output]{border-top:1px dotted #ddd;border-bottom:5px double #ddd;}
</style>
	`;
	requestAnimationFrame(()=>{
		let node = document.querySelector('form');
		node.addEventListener('submit', _form);
		node.addEventListener('cancel', _form);
	});
});
