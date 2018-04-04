use transactions;
db.createView("blockchain","pending_blocks",[		{
					"$match" : {
						"index" : 0
					}
				},
				{
					"$graphLookup" : {
						"from" : "pending_blocks",
						"startWith" : "$previousHash",
						"connectFromField" : "hash",
						"connectToField" : "previousHash",
						"as" : "chain"
					}
				},
				{
					"$unwind" : "$chain"
				},
				{
					"$sort" : {
						"chain.index" : 1
					}
				},
				{
					"$group" : {
						"_id" : "$_id",
						"chain" : {
							"$push" : "$chain"
						}
					}
				},
				{
					"$project" : {
						"chain" : 1,
						"_id" : 0
					}
				}
			]);
