Array.from( document.querySelectorAll( '.person__children' ) ).forEach(( block ) => {
  let btn = document.createElement('button');
  btn.textContent = 'toggle';
  handler = (function (b) {
    return (ev) => {
      console.log('toggle', b.style.display);
      b.style.display = b.style.display === '' ? 'none' : '';
    };
  }(block));
  btn.addEventListener( 'click', handler);
  block.parentNode.insertBefore(btn, block);
});
