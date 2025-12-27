export function getJoinMeta(company: any) {
  return {
    sent: company.companyJoinsAsOne[0] ?? null, // I sent
    received: company.companyJoinsAsTwo[0] ?? null, // I received
  };
}
