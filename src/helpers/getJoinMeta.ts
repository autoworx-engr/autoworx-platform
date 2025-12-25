export function getJoinMeta(company: any) {
  return {
    received: company.companyJoinsAsOne[0] ?? null, // I sent
    sent: company.companyJoinsAsTwo[0] ?? null, // I received
  };
}
