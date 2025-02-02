import React from 'react';
import styled from 'styled-components';

const Checkbox = () => {
  return (
    <StyledWrapper>
      <label className="container">
        <input type="checkbox" checked readOnly />
        <div className="checkmark">
          <svg xmlns="http://www.w3.org/2000/svg" className="ionicon" viewBox="0 0 512 512">
            <title>Checkmark</title>
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={32} d="M416 128L192 384l-96-96" />
          </svg>
        </div>
      </label>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Hide the default checkbox */
  .container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
    display: none;
    color: white;
  }

  .container {
    --size: 50px;
    width: var(--size);
    display: block;
    height: var(--size);
    background-color: #1DA1F2;
    border-radius: 100%;
    cursor: pointer;
    padding: 5px;
    color: black;
    box-shadow: 1.5px 1.5px 3px linear-gradient(90deg, #1DA1F2, #81c6f2), -1.5px -1.5px 3px linear-gradient(90deg, #1DA1F2, #81c6f2), inset 0px 0px 0px linear-gradient(90deg, #1DA1F2, #81c6f2), inset 0px -0px 0px linear-gradient(90deg, #1DA1F2, #81c6f2);
  }


  .container .checkmark svg {
    opacity: 0;
    transition: all ease 0.3s;
  }
  .container input:checked + .checkmark svg {
    opacity: 1;
  }`;

export default Checkbox;
