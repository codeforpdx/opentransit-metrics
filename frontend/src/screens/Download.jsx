import React from 'react';
import DateRangeControlNoFilters from '../components/DateRangeControlNoFilters';

// import DisplayArrivals from '../components/DisplayArrivals';




export default function Download() {
  return (
    <div style={{ padding: '0px 20px', maxWidth: '800px' }}>
      <p>
        Click the link below to download the data for Route 4 on 3/10/2022.
      </p>
      <p>
	    <a href="http://localhost:5000/api/arrival_download">Test Download Fixed Reference</a>
     </p>
      <div>
        <DateRangeControlNoFilters />
      </div>
    </div>
  );
}
