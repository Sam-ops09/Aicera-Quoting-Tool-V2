import dns from 'dns';

const hostname = 'ep-round-lake-afmg7axz.c-2.us-west-2.aws.neon.tech';

dns.lookup(hostname, (err, address, family) => {
  if (err) {
    console.error('DNS lookup failed:', err);
    return;
  }
  console.log(`IP address for ${hostname}: ${address}`);
  console.log(`IP family: IPv${family}`);
});

