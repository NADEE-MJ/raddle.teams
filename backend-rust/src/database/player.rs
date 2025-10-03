use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "player")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    #[sea_orm(unique, indexed)]
    pub session_id: String,
    #[sea_orm(indexed)]
    pub lobby_id: i32,
    #[sea_orm(indexed)]
    pub team_id: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::models::Entity",
        from = "Column::LobbyId",
        to = "super::models::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Lobby,
    #[sea_orm(
        belongs_to = "super::team::Entity",
        from = "Column::TeamId",
        to = "super::team::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Team,
}

impl Related<super::models::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Lobby.def()
    }
}

impl Related<super::team::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Team.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

pub use Entity as Player;
pub use Model as PlayerModel;
pub use ActiveModel as PlayerActiveModel;
