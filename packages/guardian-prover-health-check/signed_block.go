package guardianproverhealthcheck

import (
	"context"
	"time"
)

type SignedBlock struct {
	GuardianProverID uint64    `json:"guardianProverID"`
	BlockID          uint64    `json:"blockID"`
	BlockHash        string    `json:"blockHash"`
	Signature        string    `json:"signature"`
	RecoveredAddress string    `json:"recoveredAddress"`
	CreatedAt        time.Time `json:"createdAt"`
}

type SaveSignedBlockOpts struct {
	GuardianProverID uint64
	BlockID          uint64
	BlockHash        string
	Signature        string
	RecoveredAddress string
}

type GetSignedBlocksByStartingBlockIDOpts struct {
	StartingBlockID uint64
}

// SignedBlockRepository defines database interaction methods to create and get
// signed blocks submitted by guardian provers.
type SignedBlockRepository interface {
	Save(ctx context.Context, opts *SaveSignedBlockOpts) error
	GetByStartingBlockID(ctx context.Context, opts GetSignedBlocksByStartingBlockIDOpts) ([]*SignedBlock, error)
	GetMostRecentByGuardianProverAddress(ctx context.Context, address string) (*SignedBlock, error)
}
