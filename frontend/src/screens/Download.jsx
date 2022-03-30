import React from 'react';
import DateRangeControlNoFilters from '../components/DateRangeControlNoFilters';

export default function Download() {
  return (
    <div style={{ padding: '0px 20px', maxWidth: '800px' }}>
      <p>
        This is a download data page. Will it work?!
      </p>
      <div>
        <DateRangeControlNoFilters />
      </div>
    </div>
  );
}
