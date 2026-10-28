"""The PyTorch model: a small neural network that predicts how suitable an
engineer is for a fault, as a number from 0 to 1."""
from torch import nn


class RankerNet(nn.Module):
    def __init__(self, n_features):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(n_features, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.layers(x).squeeze(-1)
