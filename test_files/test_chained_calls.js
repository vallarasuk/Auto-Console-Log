it('should support pagination', async () => {
  const { data } = await e2e()
    .query(gql`
      query GroupMembers(
        $groupId: ID!
        $pagination: OffsetPaginationInput
      ) {
        groupMembers(groupId: $groupId, pagination: $pagination) {
          items {
            id
          }
          pageInfo {
            hasNextPage
            totalCount
            currentPage
            pageSize
          }
        }
      }
    `)
    .variables({
      groupId,
      pagination: { page: 1, pageSize: 2 },
    })
    .set({ Authorization: `Bearer ${token}` })
    .expectNoErrors()

  expect(data.groupMembers.items).toHaveLength(2)
})
