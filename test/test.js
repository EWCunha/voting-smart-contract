const Voting = artifacts.require("Voting")
const { expectRevert, time } = require("@openzeppelin/test-helpers")

contract("Voting", (accounts) => {
    let voting
    beforeEach(async () => {
        voting = await Voting.new({ from: accounts[0] })
    })

    it("Should add voters", async () => {
        const votersBefore = []
        votersBefore[0] = await voting.voters(accounts[0])
        votersBefore[1] = await voting.voters(accounts[1])
        votersBefore[2] = await voting.voters(accounts[2])
        votersBefore[3] = await voting.voters(accounts[3])
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })

        const votersAfter = []
        votersAfter[0] = await voting.voters(accounts[0])
        votersAfter[1] = await voting.voters(accounts[1])
        votersAfter[2] = await voting.voters(accounts[2])
        votersAfter[3] = await voting.voters(accounts[3])

        assert(votersBefore[0] === false)
        assert(votersBefore[1] === false)
        assert(votersBefore[2] === false)
        assert(votersBefore[3] === false)
        assert(votersAfter[0] === true)
        assert(votersAfter[1] === true)
        assert(votersAfter[2] === true)
        assert(votersAfter[3] === false)
    })

    it("Should NOT add voters if sender is not admin", async () => {
        await expectRevert(voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[1] }), "only admin")
    })

    it("Should create ballot", async () => {
        const tx = await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        const block = await web3.eth.getBlock(tx.receipt.blockNumber)
        const nextBallotId = parseInt(await voting.nextBallotId())
        const ballot = await voting.ballots(nextBallotId - 1)

        assert(nextBallotId === 1)
        assert(parseInt(ballot.id) === 0)
        assert(ballot.name === "new ballot")
        assert(parseInt(ballot.end) === block.timestamp + 10)
        // assert(ballot.choices === ["1", "2", "3"])
    })

    it("Should NOT create ballot if sender is not admin", async () => {
        await expectRevert(voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[3] }), "only admin")
    })

    it("Should add a vote", async () => {
        await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })

        const ballotId = parseInt(await voting.nextBallotId()) - 1
        const votesBefore = await voting.votes(accounts[1], ballotId)
        const ballotBefore = await voting.ballots(ballotId)

        await voting.vote(ballotId, 0, { from: accounts[1] })

        const votesAfter = await voting.votes(accounts[1], ballotId)
        const ballotAfter = await voting.ballots(ballotId)

        assert(votesBefore === false)
        // assert(parseInt(ballotBefore.choices[0].votes) === 0)
        assert(votesAfter === true)
        // assert(parseInt(ballotAfter.choices[0].votes) === 1)
    })

    it("Should NOT add vote if sender is not voter", async () => {
        await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })
        const ballotId = parseInt(await voting.nextBallotId()) - 1
        await expectRevert(voting.vote(ballotId, 0, { from: accounts[5] }), "only voters can vote")
    })

    it("Should NOT add vote if sender has already voted", async () => {
        await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })
        const ballotId = parseInt(await voting.nextBallotId()) - 1
        await voting.vote(ballotId, 0, { from: accounts[1] })
        await expectRevert(voting.vote(ballotId, 0, { from: accounts[1] }), "voter can only vote once for a ballot")
    })

    it("Should NOT add vote if ballot has ended", async () => {
        await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        const ballotId = parseInt(await voting.nextBallotId()) - 1
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })
        await time.increase(10001)
        await expectRevert(voting.vote(ballotId, 0, { from: accounts[1] }), "can only vote until ballot end date")
    })

    it("Should return the ballot's results", async () => {
        await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })
        const ballotId = parseInt(await voting.nextBallotId()) - 1
        await voting.vote(ballotId, 0, { from: accounts[1] })
        await time.increase(10001)

        const result = await voting.results(ballotId)
        assert(parseInt(result[0].id) === 0)
        assert(result[0].name === "1")
        assert(parseInt(result[0].votes) === 1)
        assert(parseInt(result[1].id) === 1)
        assert(result[1].name === "2")
        assert(parseInt(result[1].votes) === 0)
        assert(parseInt(result[2].id) === 2)
        assert(result[2].name === "3")
        assert(parseInt(result[2].votes) === 0)
    })

    it("Should NOT return results if ballot not ended", async () => {
        await voting.createBallot("new ballot", ["1", "2", "3"], 10, { from: accounts[0] })
        await voting.addVoters([accounts[0], accounts[1], accounts[2]], { from: accounts[0] })
        const ballotId = parseInt(await voting.nextBallotId()) - 1
        await voting.vote(ballotId, 0, { from: accounts[1] })
        await expectRevert(voting.results(ballotId), "cannot see the ballot result before ballot end")
    })
})