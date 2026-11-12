import { useState } from 'react';

export function useDialog() {
  const [state, setState] = useState(null);
  const [text, setText] = useState('');

  const ask = (options) =>
    new Promise((resolve) => {
      setText(options.defaultValue || '');
      setState({ ...options, resolve });
    });

  const close = (value) => {
    state.resolve(value);
    setState(null);
  };

  const dialog = state && (
    <div className='overlay'>
      <form
        className='card modal'
        onSubmit={(e) => {
          e.preventDefault();
          close(state.input ? text : true);
        }}
      >
        <h3>{state.title}</h3>
        {state.message && <p className='muted'>{state.message}</p>}
        {state.input && (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={state.placeholder || ''}
          />
        )}
        <div className='row'>
          <button type='submit'>{state.confirmText || 'OK'}</button>
          <button type='button' className='secondary' onClick={() => close(null)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  return { ask, dialog };
}